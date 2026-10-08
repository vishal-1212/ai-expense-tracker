import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // 1. AI #1 & AI #3: Smart Categorization & Natural Language Expense Entry
  app.post("/api/ai/parse-expense", async (req, res) => {
    try {
      const { text, currentDate = "2026-10-08" } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Expense text input is required." });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Parse this personal expense entry into structured fields.
Current date context: ${currentDate} (Format YYYY-MM-DD).
User input: "${text}"

Rules:
1. Allowed categories are strictly: "Food", "Shopping", "Travel", "Bills", "Other".
2. Subcategory should be a concise 1-2 word label such as "Dining", "Delivery", "Coffee & Snacks", "Groceries", "Cab & Auto", "Metro & Bus", "Fuel", "Apparel", "Electronics", "Utilities", "Mobile & Wi-Fi", "Subscriptions", "Entertainment", "Books & Study", or "Personal Care".
3. Extract numeric amount in INR (₹). If multiple numbers appear, identify the monetary amount.
4. Clean up description into a natural title-case merchant or item phrase (e.g., "Dinner at Swiggy", "Uber Ride", "Coffee at Third Wave").
5. Resolve relative dates like "today", "yesterday", "2 days ago", or specific October dates into YYYY-MM-DD based on ${currentDate}.
6. Identify paymentMethod strictly as one of: "UPI", "Cash", "Card". Default to "UPI" if not mentioned.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: {
                type: Type.NUMBER,
                description: "Extracted monetary amount in INR.",
              },
              category: {
                type: Type.STRING,
                description: "One of: Food, Shopping, Travel, Bills, Other",
              },
              subcategory: {
                type: Type.STRING,
                description: "Concise subcategory such as Dining, Cab & Auto, Apparel, Utilities",
              },
              description: {
                type: Type.STRING,
                description: "Clean merchant or expense description, e.g., Dinner at Swiggy",
              },
              date: {
                type: Type.STRING,
                description: "Resolved date in YYYY-MM-DD format",
              },
              paymentMethod: {
                type: Type.STRING,
                description: "One of: UPI, Cash, Card",
              },
              reasoning: {
                type: Type.STRING,
                description: "Brief 1-sentence explanation of how AI categorized this expense",
              },
            },
            required: [
              "amount",
              "category",
              "subcategory",
              "description",
              "date",
              "paymentMethod",
              "reasoning",
            ],
          },
        },
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error in /api/ai/parse-expense:", error);
      res.status(500).json({
        error: error?.message || "Failed to parse expense with AI.",
      });
    }
  });

  // 2. Step 2 AI Feature: Receipt / Bill Image Analysis (Camera & Image Upload)
  app.post("/api/ai/analyze-receipt", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", currentDate = "2026-10-08" } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "Receipt image data is required." });
        return;
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analyze this receipt, bill, or payment screenshot. Extract the total amount in INR (₹), merchant/description, category (strictly one of: "Food", "Shopping", "Travel", "Bills", "Other"), subcategory (e.g. "Dining", "Groceries", "Cab & Auto", "Apparel", "Utilities"), date in YYYY-MM-DD format (use ${currentDate} if not visible on receipt), and paymentMethod ("UPI", "Cash", or "Card").`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              subcategory: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              paymentMethod: { type: Type.STRING },
              itemsSummary: {
                type: Type.STRING,
                description: "Short summary of items or merchant spotted on the bill",
              },
            },
            required: [
              "amount",
              "category",
              "subcategory",
              "description",
              "date",
              "paymentMethod",
              "itemsSummary",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || "{}").trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error in /api/ai/analyze-receipt:", error);
      res.status(500).json({
        error: error?.message || "Failed to analyze receipt image.",
      });
    }
  });

  // 3. Step 2 AI Feature: Speech-to-Text Voice Expense Entry
  app.post("/api/ai/transcribe-expense", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm", currentDate = "2026-10-08" } = req.body;
      if (!audioBase64) {
        res.status(400).json({ error: "Audio recording is required." });
        return;
      }

      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
      const ai = getGenAIClient();

      // Step A: Transcribe audio using gemini-3.5-transcribe
      const transcriptionResponse = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: "Transcribe this spoken expense note accurately, including numbers, rupees, and merchant names.",
            },
          ],
        },
      });

      const transcript = (transcriptionResponse.text || "").trim();
      if (!transcript) {
        res.status(400).json({ error: "Could not detect speech in audio." });
        return;
      }

      // Step B: Parse the transcript into structured expense fields
      const parseResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Parse this spoken expense transcript into structured fields.
Current date: ${currentDate}.
Transcript: "${transcript}"
Allowed categories: "Food", "Shopping", "Travel", "Bills", "Other".
Allowed paymentMethods: "UPI", "Cash", "Card".`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcript: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              subcategory: { type: Type.STRING },
              description: { type: Type.STRING },
              date: { type: Type.STRING },
              paymentMethod: { type: Type.STRING },
              reasoning: { type: Type.STRING },
            },
            required: [
              "transcript",
              "amount",
              "category",
              "subcategory",
              "description",
              "date",
              "paymentMethod",
              "reasoning",
            ],
          },
        },
      });

      const parsed = JSON.parse((parseResponse.text || "{}").trim());
      res.json({ ...parsed, transcript });
    } catch (error: any) {
      console.error("Error in /api/ai/transcribe-expense:", error);
      res.status(500).json({
        error: error?.message || "Failed to transcribe voice expense.",
      });
    }
  });

  // 4. AI #2: Spending Insights Generator
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const {
        expenses = [],
        monthlyBudget = 25000,
        previousMonthTotal = 16470,
        previousFoodTotal = 3100,
      } = req.body;

      const ai = getGenAIClient();
      const summaryPayload = JSON.stringify({
        monthlyBudget,
        previousMonthTotal,
        previousFoodTotal,
        expensesCount: expenses.length,
        expenses: expenses.slice(0, 40),
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `You are SpendAI, a friendly, clear financial advisor for college students and young professionals in India.
Analyze the user's October 2026 expense data below and provide simple, actionable spending insights in Indian Rupees (₹). Avoid complex financial jargon.

Data:
${summaryPayload}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dashboardBanner: {
                type: Type.STRING,
                description: "Concise 1-sentence insight for the main dashboard card, e.g. 'You spent 32% more on food this month.'",
              },
              recommendationHeadline: {
                type: Type.STRING,
                description: "Direct comparison sentence, e.g. 'You spent ₹2,100 more on food this month.'",
              },
              recommendationBody: {
                type: Type.STRING,
                description: "Concrete saving calculation, e.g. 'Reducing food spending by 20% could save approximately ₹1,040 this month.'",
              },
              potentialMonthlySavings: {
                type: Type.NUMBER,
                description: "Estimated monthly savings in INR if recommendation is followed",
              },
              suggestedGoalCategory: {
                type: Type.STRING,
                description: "Category to set a goal for, e.g. Food",
              },
              suggestedGoalAmount: {
                type: Type.NUMBER,
                description: "Suggested monthly cap in INR, e.g. 4500",
              },
              suggestedGoalText: {
                type: Type.STRING,
                description: "Friendly goal suggestion, e.g. 'Try keeping food expenses below ₹4,500 next month.'",
              },
              observations: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "3 concise, specific bullet observations about their spending patterns and merchants.",
              },
            },
            required: [
              "dashboardBanner",
              "recommendationHeadline",
              "recommendationBody",
              "potentialMonthlySavings",
              "suggestedGoalCategory",
              "suggestedGoalAmount",
              "suggestedGoalText",
              "observations",
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text || "{}").trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error in /api/ai/insights:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate AI spending insights.",
      });
    }
  });

  // 5. Step 2 AI Feature: AI Natural Language Expense Search
  app.post("/api/ai/search", async (req, res) => {
    try {
      const { query, expenses = [] } = req.body;
      if (!query) {
        res.status(400).json({ error: "Search query is required." });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Filter the user's expenses based on their natural language query: "${query}".
Current date is 2026-10-08.
Expenses JSON:
${JSON.stringify(
  expenses.map((e: any) => ({
    id: e.id,
    amount: e.amount,
    category: e.category,
    subcategory: e.subcategory,
    description: e.description,
    date: e.date,
    paymentMethod: e.paymentMethod,
  }))
)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchingIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of expense IDs that match the user's natural language query",
              },
              summary: {
                type: Type.STRING,
                description: "Short natural explanation of the search results, e.g. 'Found 4 food expenses over ₹200 totaling ₹2,450'",
              },
            },
            required: ["matchingIds", "summary"],
          },
        },
      });

      const parsed = JSON.parse((response.text || "{}").trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error in /api/ai/search:", error);
      res.status(500).json({
        error: error?.message || "Failed to perform AI search.",
      });
    }
  });

  // 6. Step 2 AI Feature: Audio Briefing (Text-to-Speech via gemini-3.8-flash-lite-tts)
  app.post("/api/ai/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ error: "Text is required for speech synthesis." });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text,
                speechMetadata: {
                  style: "Warm, encouraging, clear personal finance advisor",
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: "No audio returned from model." });
        return;
      }

      res.json({ audioDataUrl: `data:audio/wav;base64,${base64Audio}` });
    } catch (error: any) {
      console.error("Error in /api/ai/tts:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate speech.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SpendAI server running on http://localhost:${PORT}`);
  });
}

startServer();
