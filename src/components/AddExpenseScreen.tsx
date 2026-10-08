import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Camera,
  Mic,
  Square,
  Upload,
  Check,
  ArrowLeft,
  Loader2,
  Receipt,
  X,
} from "lucide-react";
import {
  Expense,
  ExpenseCategory,
  PaymentMethod,
  UserPreferences,
} from "../types";
import { CURRENT_DATE } from "../data/initialData";
import {
  parseExpenseLocally,
  createSampleReceiptBase64,
  formatCurrency,
} from "../utils/smartParser";
import { CategoryIcon, CATEGORY_META } from "./CategoryIcon";

interface AddExpenseScreenProps {
  preferences: UserPreferences;
  editingExpense?: Expense | null;
  onSaveExpense: (expense: Omit<Expense, "id">, existingId?: string) => void;
  onCancel: () => void;
}

const CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Other",
];
const PAYMENT_METHODS: PaymentMethod[] = ["UPI", "Cash", "Card"];

const QUICK_NL_EXAMPLES = [
  "250 dinner swiggy",
  "Spent 500 on Uber yesterday",
  "₹450 dinner with friends",
  "₹899 Cotton T-shirt via Card",
];

export const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({
  preferences,
  editingExpense,
  onSaveExpense,
  onCancel,
}) => {
  const [naturalInput, setNaturalInput] = useState(
    editingExpense ? "" : "250 dinner swiggy"
  );
  const [amountStr, setAmountStr] = useState(
    editingExpense ? String(editingExpense.amount) : "250"
  );
  const [description, setDescription] = useState(
    editingExpense ? editingExpense.description : "Dinner at Swiggy"
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    editingExpense ? editingExpense.category : "Food"
  );
  const [subcategory, setSubcategory] = useState(
    editingExpense ? editingExpense.subcategory : "Dining"
  );
  const [date, setDate] = useState(
    editingExpense ? editingExpense.date : CURRENT_DATE
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingExpense ? editingExpense.paymentMethod : "UPI"
  );
  const [aiReasoning, setAiReasoning] = useState(
    editingExpense?.reasoning ||
      "AI detected: ₹250 → Food → Dining"
  );
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [userManuallyEditedCategory, setUserManuallyEditedCategory] =
    useState(false);

  // Multimodal Step 2 states: Receipt Scanner (Camera / Upload) & Voice Entry
  const [activeAiTool, setActiveAiTool] = useState<
    "none" | "receipt" | "camera" | "voice"
  >("none");
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null
  );
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up camera/mic on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Instant local smart parsing as the user types in the natural language input
  const handleNaturalInputChange = (val: string) => {
    setNaturalInput(val);
    setErrorMessage(null);
    if (!preferences.smartCategorization || !val.trim()) return;

    const draft = parseExpenseLocally(val, CURRENT_DATE);
    if (draft.amount !== null) {
      setAmountStr(String(draft.amount));
    }
    setDescription(draft.description);
    if (!userManuallyEditedCategory) {
      setCategory(draft.category);
      setSubcategory(draft.subcategory);
    }
    setDate(draft.date);
    setPaymentMethod(draft.paymentMethod);
    setAiReasoning(
      `AI detected: ${
        draft.amount ? formatCurrency(draft.amount, preferences.currency) + " → " : ""
      }${draft.category} → ${draft.subcategory}`
    );
  };

  // Deep Gemini AI parse via /api/ai/parse-expense
  const handleRunGeminiParse = async (textToParse?: string) => {
    const query = (textToParse ?? naturalInput).trim();
    if (!query) return;

    setIsAiParsing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/ai/parse-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: query,
          currentDate: CURRENT_DATE,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse with Gemini AI.");
      }

      if (typeof data.amount === "number" && data.amount > 0) {
        setAmountStr(String(data.amount));
      }
      if (data.description) {
        setDescription(data.description);
      }
      if (
        data.category &&
        CATEGORIES.includes(data.category as ExpenseCategory)
      ) {
        setCategory(data.category as ExpenseCategory);
      }
      if (data.subcategory) {
        setSubcategory(data.subcategory);
      }
      if (data.date) {
        setDate(data.date);
      }
      if (
        data.paymentMethod &&
        PAYMENT_METHODS.includes(data.paymentMethod as PaymentMethod)
      ) {
        setPaymentMethod(data.paymentMethod as PaymentMethod);
      }
      setAiReasoning(
        data.reasoning ||
          `AI detected: ${data.category} → ${data.subcategory}`
      );
      setStatusMessage("Categorized with Gemini AI");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      // Fallback already applied via local parser
      const draft = parseExpenseLocally(query, CURRENT_DATE);
      setAiReasoning(
        `AI detected: ${draft.category} → ${draft.subcategory}`
      );
    } finally {
      setIsAiParsing(false);
    }
  };

  // Analyze Receipt Image via Gemini Vision (/api/ai/analyze-receipt)
  const analyzeReceiptImage = async (dataUrl: string, mimeType: string) => {
    setIsAnalyzingReceipt(true);
    setErrorMessage(null);
    setReceiptPreviewUrl(dataUrl);

    try {
      const response = await fetch("/api/ai/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          mimeType,
          currentDate: CURRENT_DATE,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not analyze receipt image.");
      }

      if (typeof data.amount === "number" && data.amount > 0) {
        setAmountStr(String(data.amount));
      }
      if (data.description) {
        setDescription(data.description);
        setNaturalInput(`${data.amount || ""} ${data.description}`.trim());
      }
      if (
        data.category &&
        CATEGORIES.includes(data.category as ExpenseCategory)
      ) {
        setCategory(data.category as ExpenseCategory);
      }
      if (data.subcategory) {
        setSubcategory(data.subcategory);
      }
      if (data.date) {
        setDate(data.date);
      }
      if (
        data.paymentMethod &&
        PAYMENT_METHODS.includes(data.paymentMethod as PaymentMethod)
      ) {
        setPaymentMethod(data.paymentMethod as PaymentMethod);
      }
      setAiReasoning(
        data.itemsSummary
          ? `Receipt scanned: ${data.itemsSummary}`
          : `Receipt extracted: ${data.category} → ${data.subcategory}`
      );
      setStatusMessage("Receipt analyzed and fields populated");
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to analyze receipt. Try another image."
      );
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        analyzeReceiptImage(reader.result, file.type || "image/jpeg");
      }
    };
    reader.readAsDataURL(file);
  };

  // Start Camera for Live Receipt Capture
  const startCamera = async () => {
    setErrorMessage(null);
    setActiveAiTool("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setErrorMessage(
        "Camera permission was denied or unavailable. Use Upload Receipt or try a Sample Receipt below."
      );
      setActiveAiTool("receipt");
    }
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      stopCamera();
      setActiveAiTool("receipt");
      analyzeReceiptImage(dataUrl, "image/jpeg");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  // Voice Recording (Speech-to-Text via /api/ai/transcribe-expense)
  const startVoiceRecording = async () => {
    setErrorMessage(null);
    setActiveAiTool("voice");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        stopCamera();
        setIsRecordingVoice(false);
        setIsTranscribingVoice(true);

        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === "string") {
            try {
              const res = await fetch("/api/ai/transcribe-expense", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: reader.result,
                  mimeType,
                  currentDate: CURRENT_DATE,
                }),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.error || "Voice transcription failed.");
              }
              if (data.transcript) {
                setNaturalInput(data.transcript);
              }
              if (typeof data.amount === "number" && data.amount > 0) {
                setAmountStr(String(data.amount));
              }
              if (data.description) setDescription(data.description);
              if (
                data.category &&
                CATEGORIES.includes(data.category as ExpenseCategory)
              ) {
                setCategory(data.category as ExpenseCategory);
              }
              if (data.subcategory) setSubcategory(data.subcategory);
              if (data.date) setDate(data.date);
              if (
                data.paymentMethod &&
                PAYMENT_METHODS.includes(data.paymentMethod as PaymentMethod)
              ) {
                setPaymentMethod(data.paymentMethod as PaymentMethod);
              }
              setAiReasoning(
                `Voice parsed: "${data.transcript}" → ${data.category} · ${data.subcategory}`
              );
              setStatusMessage("Voice note transcribed & categorized");
            } catch (err: any) {
              setErrorMessage(
                err?.message || "Could not transcribe audio. Try typing instead."
              );
            } finally {
              setIsTranscribingVoice(false);
            }
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
    } catch {
      setErrorMessage(
        "Microphone access is unavailable in this browser frame. Try typing your expense in the smart bar above."
      );
      setActiveAiTool("none");
    }
  };

  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Date quick helpers
  const yesterdayDate = (() => {
    const d = new Date(CURRENT_DATE + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr.replace(/,/g, ""));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage("Please enter a valid expense amount greater than ₹0.");
      return;
    }

    onSaveExpense(
      {
        amount: numericAmount,
        category,
        subcategory: subcategory.trim() || "General",
        description: description.trim() || `${category} Expense`,
        date: date || CURRENT_DATE,
        paymentMethod,
        aiCategorized: preferences.smartCategorization,
        reasoning: aiReasoning,
      },
      editingExpense?.id
    );
  };

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {editingExpense ? "Edit Expense" : "Add Expense"}
            </h1>
            <p className="text-xs text-slate-500">
              Type naturally, scan a bill, or adjust fields below
            </p>
          </div>
        </div>
      </div>

      {/* Natural Language & Multimodal AI Entry Bar */}
      {!editingExpense && (
        <div className="bg-white border border-indigo-200/90 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="nl-expense-input"
              className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5"
            >
              <Sparkles size={14} />
              <span>Natural-Language Smart Entry</span>
            </label>

            {/* Step 2 Multimodal AI Action Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveAiTool(
                    activeAiTool === "receipt" ? "none" : "receipt"
                  );
                }}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  activeAiTool === "receipt" || activeAiTool === "camera"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Receipt size={13} />
                <span>Scan Bill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isRecordingVoice) {
                    stopVoiceRecording();
                  } else {
                    startVoiceRecording();
                  }
                }}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  isRecordingVoice
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isRecordingVoice ? <Square size={13} /> : <Mic size={13} />}
                <span>{isRecordingVoice ? "Stop Mic" : "Voice"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="nl-expense-input"
              type="text"
              value={naturalInput}
              onChange={(e) => handleNaturalInputChange(e.target.value)}
              placeholder="e.g. ₹250 dinner at Swiggy or Spent 500 on Uber yesterday"
              className="flex-1 h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => handleRunGeminiParse()}
              disabled={isAiParsing || !naturalInput.trim()}
              className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              {isAiParsing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>{isAiParsing ? "Parsing..." : "AI Categorize"}</span>
            </button>
          </div>

          {/* Quick Example Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Examples:</span>
            {QUICK_NL_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setUserManuallyEditedCategory(false);
                  handleNaturalInputChange(example);
                  handleRunGeminiParse(example);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Step 2 Tool Drawer: Receipt Image Analysis / Camera */}
          {(activeAiTool === "receipt" || activeAiTool === "camera") && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  AI Receipt & Bill Scanner (Gemini Vision)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveAiTool("none");
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  aria-label="Close scanner"
                >
                  <X size={15} />
                </button>
              </div>

              {activeAiTool === "camera" ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-4/3 max-h-60 mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={captureCameraFrame}
                      className="min-h-[40px] px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera size={14} />
                      <span>Capture Bill</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setActiveAiTool("receipt");
                      }}
                      className="min-h-[40px] px-4 py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl cursor-pointer"
                    >
                      Cancel Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzingReceipt}
                      className="min-h-[40px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Upload size={14} />
                      <span>Upload Receipt Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isAnalyzingReceipt}
                      className="min-h-[40px] px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Camera size={14} />
                      <span>Use Camera</span>
                    </button>
                  </div>

                  {/* 1-Click Sample Receipts for Instant Demo Testing */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500">
                      Or test AI Vision with a sample Indian bill:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["swiggy", "uber", "bluetokai"] as const).map(
                        (preset) => {
                          const labels = {
                            swiggy: "Sample Swiggy Bill (₹250)",
                            uber: "Sample Uber Receipt (₹180)",
                            bluetokai: "Sample Cafe Bill (₹340)",
                          };
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={isAnalyzingReceipt}
                              onClick={() => {
                                const sample = createSampleReceiptBase64(preset);
                                analyzeReceiptImage(
                                  sample.dataUrl,
                                  sample.mimeType
                                );
                              }}
                              className="px-2.5 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {labels[preset]}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {isAnalyzingReceipt && (
                    <div className="flex items-center gap-2 text-xs text-indigo-700 font-medium py-1">
                      <Loader2 size={14} className="animate-spin" />
                      <span>
                        Gemini Vision is reading merchant, total amount, and
                        category...
                      </span>
                    </div>
                  )}

                  {receiptPreviewUrl && !isAnalyzingReceipt && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={receiptPreviewUrl}
                        alt="Scanned receipt preview"
                        referrerPolicy="no-referrer"
                        className="w-12 h-14 object-cover rounded-lg border border-slate-200"
                      />
                      <span className="text-xs text-emerald-700 font-medium">
                        Receipt scanned and fields filled below. You can review
                        or edit before saving.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Voice Recording Status */}
          {(isRecordingVoice || isTranscribingVoice) && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <Loader2 size={14} className="animate-spin" />
                <span>
                  {isRecordingVoice
                    ? 'Listening... Say e.g. "Spent 350 rupees on Zomato lunch"'
                    : "Transcribing voice note with Gemini..."}
                </span>
              </div>
              {isRecordingVoice && (
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg font-semibold"
                >
                  Done Speaking
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Structured Expense Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-6"
      >
        {statusMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Large Amount Input */}
        <div>
          <label
            htmlFor="expense-amount-input"
            className="block text-xs font-medium text-slate-500 mb-1.5"
          >
            Amount
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-2xl sm:text-3xl font-bold font-mono-tabular text-slate-400 select-none">
              ₹
            </span>
            <input
              id="expense-amount-input"
              type="number"
              min="1"
              step="any"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="250"
              className="w-full h-16 pl-11 pr-4 text-3xl sm:text-4xl font-bold font-mono-tabular text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label
            htmlFor="expense-desc-input"
            className="block text-xs font-medium text-slate-700 mb-1.5"
          >
            What did you spend on?
          </label>
          <input
            id="expense-desc-input"
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner at Swiggy"
            className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* AI Detected Category & Editable Selector */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              AI Detected Category (Editable)
            </span>
            <span className="text-xs text-indigo-600 font-medium">
              {aiReasoning}
            </span>
          </div>

          {/* Current Selected Category & Subcategory Summary Row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <CategoryIcon category={category} size="md" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {category}{" "}
                  <span className="text-slate-400 font-normal mx-1">→</span>{" "}
                  <span className="text-indigo-700">{subcategory}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Click any category or subcategory below to override
                </p>
              </div>
            </div>
          </div>

          {/* Category Interactive Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setUserManuallyEditedCategory(true);
                    setCategory(cat);
                    const defaultSub =
                      CATEGORY_META[cat].defaultSubcategories[0] || "General";
                    setSubcategory(defaultSub);
                    setAiReasoning(`Category set to ${cat} → ${defaultSub}`);
                  }}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex flex-col items-center justify-center gap-1 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Subcategory Presets + Custom Input */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {CATEGORY_META[category].defaultSubcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSubcategory(sub);
                  setAiReasoning(`Category set to ${category} → ${sub}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  subcategory === sub
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="Custom subcategory"
              aria-label="Subcategory"
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Date Selector */}
          <div>
            <label
              htmlFor="expense-date-input"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Date
            </label>
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(CURRENT_DATE)}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    date === CURRENT_DATE
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Today (Oct 8)
                </button>
                <button
                  type="button"
                  onClick={() => setDate(yesterdayDate)}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    date === yesterdayDate
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Yesterday
                </button>
              </div>
              <input
                id="expense-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 text-xs font-mono-tabular bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      active
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? "bg-white" : "bg-slate-300"
                      }`}
                    />
                    <span>{method}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save Expense CTA */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex-1 min-h-[48px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>{editingExpense ? "Update Expense" : "Save Expense"}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
