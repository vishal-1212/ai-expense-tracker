import React, { useState } from "react";
import { ArrowRight, Sparkles, Check, Wallet } from "lucide-react";
import { parseExpenseLocally, formatCurrency } from "../utils/smartParser";
import { CategoryIcon } from "./CategoryIcon";
import onboardingVisualUrl from "../assets/images/spendai_onboarding_visual_1791450594503.jpg";

interface OnboardingScreenProps {
  userName: string;
  monthlyBudget: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
  onComplete: (name: string, budget: number) => void;
}

const SAMPLE_PROMPTS = [
  "₹250 Swiggy dinner",
  "Spent 500 on Uber yesterday",
  "₹899 Cotton T-shirt via Card",
  "₹120 Iced Coffee at Blue Tokai",
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  userName,
  monthlyBudget,
  currency,
  onComplete,
}) => {
  const [nameInput, setNameInput] = useState(userName || "Vishal");
  const [budgetInput, setBudgetInput] = useState(String(monthlyBudget || 25000));
  const [demoText, setDemoText] = useState("₹250 Swiggy dinner");
  const [imageFailed, setImageFailed] = useState(false);

  const parsedDemo = parseExpenseLocally(demoText);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || "Vishal";
    const numBudget = Math.max(1000, parseInt(budgetInput.replace(/,/g, ""), 10) || 25000);
    onComplete(cleanName, numBudget);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Brand & Onboarding Setup */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Wallet size={20} strokeWidth={2.2} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SpendAI
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.15] balance-text">
              Track Smarter. Spend Better.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Automatically understand where your money goes and get simple,
              actionable spending insights tailored for students and young
              professionals.
            </p>
          </div>

          {/* Interactive Live AI Categorization Preview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Try Instant AI Expense Categorization
              </span>
              <span className="text-xs text-slate-500">
                Type or select an example
              </span>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={demoText}
                onChange={(e) => setDemoText(e.target.value)}
                placeholder="e.g. ₹250 Swiggy dinner"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-colors"
                aria-label="Try natural language expense input"
              />

              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setDemoText(sample)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
                      demoText === sample
                        ? "bg-indigo-600 text-white font-medium"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <CategoryIcon category={parsedDemo.category} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {parsedDemo.description}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    <span>AI detected: {parsedDemo.category}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      →
                    </span>
                    <span>{parsedDemo.subcategory}</span>
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>{parsedDemo.paymentMethod}</span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-bold font-mono-tabular text-slate-900">
                  {parsedDemo.amount
                    ? formatCurrency(parsedDemo.amount, currency)
                    : "₹0"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Personalization & Get Started Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="onboarding-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Your Name
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Vishal"
                />
              </div>
              <div>
                <label
                  htmlFor="onboarding-budget"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Monthly Budget (₹ INR)
                </label>
                <input
                  id="onboarding-budget"
                  type="number"
                  min={1000}
                  step={500}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm font-mono-tabular bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="25000"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto min-w-[220px] min-h-[48px] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <span>Get Started</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              Natural-language entry
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              Receipt & voice scanning
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              Actionable saving goals
            </span>
          </div>
        </div>

        {/* Right Column: Editorial Visual & Core Promise Showcase */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
            <div className="relative aspect-16/9 w-full bg-slate-100 overflow-hidden">
              {!imageFailed ? (
                <img
                  src={onboardingVisualUrl}
                  alt="SpendAI smart personal finance workspace"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex items-center justify-center p-6 text-white">
                  <div className="text-center space-y-2">
                    <Sparkles className="mx-auto text-indigo-300" size={28} />
                    <p className="text-sm font-medium">
                      SpendAI Financial Clarity
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent flex items-end p-5">
                <div className="text-white space-y-0.5">
                  <p className="text-xs font-medium text-indigo-200">
                    October 2026 Snapshot
                  </p>
                  <p className="text-base font-semibold">
                    Clear daily habits without complex spreadsheets
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-xs text-slate-500">Sample Monthly Pace</p>
                  <p className="text-xl font-bold font-mono-tabular text-slate-900 mt-0.5">
                    ₹18,450{" "}
                    <span className="text-xs font-normal text-slate-500">
                      / ₹25,000 budget
                    </span>
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  ₹6,550 remaining
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>1. Type or speak expenses in seconds</span>
                  <span className="font-mono-tabular text-slate-900 font-medium">
                    “250 dinner swiggy”
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>2. AI auto-categorizes every rupee</span>
                  <span className="font-mono-tabular text-indigo-700 font-medium">
                    Food → Dining
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>3. Spot savings before the month ends</span>
                  <span className="font-mono-tabular text-emerald-700 font-medium">
                    Save ~₹1,040/mo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
