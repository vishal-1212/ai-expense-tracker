import { ExpenseCategory, PaymentMethod } from "../types";
import { CURRENT_DATE } from "../data/initialData";

export interface ParsedExpenseDraft {
  amount: number | null;
  category: ExpenseCategory;
  subcategory: string;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  reasoning: string;
}

const CATEGORY_KEYWORDS: Array<{
  keywords: string[];
  category: ExpenseCategory;
  subcategory: string;
}> = [
  {
    keywords: [
      "swiggy",
      "zomato",
      "dinner",
      "lunch",
      "breakfast",
      "biryani",
      "pizza",
      "burger",
      "truffles",
      "restaurant",
      "thali",
      "dosa",
      "meal",
      "eat",
      "dining",
    ],
    category: "Food",
    subcategory: "Dining",
  },
  {
    keywords: [
      "coffee",
      "chai",
      "tea",
      "starbucks",
      "third wave",
      "blue tokai",
      "cafe",
      "snack",
      "bakery",
      "samosa",
    ],
    category: "Food",
    subcategory: "Coffee & Snacks",
  },
  {
    keywords: [
      "blinkit",
      "zepto",
      "instamart",
      "bigbasket",
      "grocery",
      "groceries",
      "milk",
      "fruits",
      "vegetables",
      "supermarket",
      "dmart",
    ],
    category: "Food",
    subcategory: "Groceries",
  },
  {
    keywords: [
      "uber",
      "ola",
      "rapido",
      "cab",
      "auto",
      "taxi",
      "ride",
      "drop",
    ],
    category: "Travel",
    subcategory: "Cab & Auto",
  },
  {
    keywords: [
      "metro",
      "bus",
      "train",
      "irctc",
      "bmtc",
      "ticket",
      "commute",
      "pass",
      "flight",
      "indigo",
      "petrol",
      "fuel",
    ],
    category: "Travel",
    subcategory: "Metro & Bus",
  },
  {
    keywords: [
      "t-shirt",
      "tshirt",
      "shirt",
      "jeans",
      "shoes",
      "sneakers",
      "myntra",
      "ajio",
      "zara",
      "westside",
      "decathlon",
      "clothes",
      "jacket",
      "hoodie",
      "dress",
    ],
    category: "Shopping",
    subcategory: "Apparel",
  },
  {
    keywords: [
      "amazon",
      "flipkart",
      "nykaa",
      "charger",
      "cable",
      "earbuds",
      "headphones",
      "mouse",
      "keyboard",
      "electronics",
      "gadget",
      "shopping",
    ],
    category: "Shopping",
    subcategory: "Electronics",
  },
  {
    keywords: [
      "wifi",
      "wi-fi",
      "airtel",
      "jio",
      "vi",
      "recharge",
      "broadband",
      "internet",
      "mobile bill",
      "phone bill",
    ],
    category: "Bills",
    subcategory: "Mobile & Wi-Fi",
  },
  {
    keywords: [
      "electricity",
      "bescom",
      "water bill",
      "gas",
      "rent",
      "maintenance",
      "utility",
      "bill",
      "netflix",
      "spotify",
      "prime",
      "subscription",
    ],
    category: "Bills",
    subcategory: "Utilities",
  },
  {
    keywords: [
      "movie",
      "pvr",
      "inox",
      "bookmyshow",
      "concert",
      "game",
      "bowling",
    ],
    category: "Other",
    subcategory: "Entertainment",
  },
  {
    keywords: ["book", "books", "course", "udemy", "college", "xerox", "print", "stationery"],
    category: "Other",
    subcategory: "Books & Study",
  },
  {
    keywords: ["gym", "cult", "pharmacy", "medicine", "doctor", "protein", "health"],
    category: "Other",
    subcategory: "Fitness & Health",
  },
];

export function parseExpenseLocally(input: string, baseDate = CURRENT_DATE): ParsedExpenseDraft {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Extract amount (supports ₹250, rs 250, 250, 1,250)
  let amount: number | null = null;
  const amountMatch = trimmed.match(/(?:₹|rs\.?|inr\s*)?\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)\b/i);
  if (amountMatch && amountMatch[1]) {
    const parsedNum = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (!isNaN(parsedNum) && parsedNum > 0) {
      amount = parsedNum;
    }
  }

  // 2. Detect date ("yesterday", "today", "2 days ago")
  let date = baseDate;
  if (lower.includes("yesterday")) {
    const d = new Date(baseDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    date = d.toISOString().slice(0, 10);
  } else if (lower.includes("2 days ago") || lower.includes("two days ago")) {
    const d = new Date(baseDate + "T12:00:00");
    d.setDate(d.getDate() - 2);
    date = d.toISOString().slice(0, 10);
  }

  // 3. Detect payment method
  let paymentMethod: PaymentMethod = "UPI";
  if (/\b(cash|notes|change)\b/i.test(lower)) {
    paymentMethod = "Cash";
  } else if (/\b(card|credit|debit|visa|mastercard)\b/i.test(lower)) {
    paymentMethod = "Card";
  }

  // 4. Detect category & subcategory
  let category: ExpenseCategory = "Food";
  let subcategory = "Dining";
  let matchedKeyword = "";

  for (const rule of CATEGORY_KEYWORDS) {
    const hit = rule.keywords.find((kw) => lower.includes(kw));
    if (hit) {
      category = rule.category;
      subcategory = rule.subcategory;
      matchedKeyword = hit;
      break;
    }
  }

  // 5. Clean description
  let cleanedDesc = trimmed
    .replace(/(?:₹|rs\.?|inr)\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/gi, "")
    .replace(/\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/g, "")
    .replace(/\b(spent|paid|for|on|yesterday|today|via|using|by|upi|cash|card|rupees|rs)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedDesc) {
    cleanedDesc = matchedKeyword
      ? matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1)
      : "Daily Expense";
  } else {
    cleanedDesc = cleanedDesc
      .split(" ")
      .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ");
    cleanedDesc = cleanedDesc.charAt(0).toUpperCase() + cleanedDesc.slice(1);
  }

  return {
    amount,
    category,
    subcategory,
    description: cleanedDesc,
    date,
    paymentMethod,
    reasoning: matchedKeyword
      ? `Detected "${matchedKeyword}" → ${category} · ${subcategory}`
      : `Categorized under ${category} · ${subcategory}`,
  };
}

export function formatCurrency(amount: number, currency: "INR" | "USD" | "EUR" | "GBP" = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] || "₹";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${symbol}${Math.round(amount).toLocaleString(locale)}`;
}

// Helper to generate a realistic receipt image on a canvas for 1-click AI Receipt Vision testing
export function createSampleReceiptBase64(preset: "swiggy" | "uber" | "bluetokai"): {
  dataUrl: string;
  mimeType: string;
  label: string;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px sans-serif";

  if (preset === "swiggy") {
    ctx.fillText("SWIGGYFOOD TAX INVOICE", 40, 60);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#475569";
    ctx.fillText("Date: 2026-10-08  20:15 IST", 40, 100);
    ctx.fillText("Restaurant: Meghana Foods, Koramangala", 40, 130);
    ctx.fillText("------------------------------------", 40, 165);
    ctx.fillStyle = "#0f172a";
    ctx.fillText("1x Paneer Butter Masala Bowl   Rs 210", 40, 205);
    ctx.fillText("1x Delivery & Packaging        Rs  30", 40, 240);
    ctx.fillText("GST (5%)                       Rs  10", 40, 275);
    ctx.fillText("------------------------------------", 40, 315);
    ctx.font = "bold 22px monospace";
    ctx.fillText("TOTAL PAID: Rs 250.00", 40, 360);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#334155";
    ctx.fillText("Payment Method: UPI (GPay)", 40, 410);
    ctx.fillText("Order ID: #SWG-8942104", 40, 440);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      mimeType: "image/jpeg",
      label: "Swiggy Dinner Receipt (₹250)",
    };
  }

  if (preset === "uber") {
    ctx.fillText("UBER INDIA TRIP RECEIPT", 40, 60);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#475569";
    ctx.fillText("Date: 2026-10-08  09:10 IST", 40, 100);
    ctx.fillText("Service: Uber Go Auto", 40, 130);
    ctx.fillText("------------------------------------", 40, 165);
    ctx.fillStyle = "#0f172a";
    ctx.fillText("Trip Fare (Indiranagar to Campus) Rs 165", 40, 205);
    ctx.fillText("Access Fee & Taxes                Rs  15", 40, 240);
    ctx.fillText("------------------------------------", 40, 285);
    ctx.font = "bold 22px monospace";
    ctx.fillText("TOTAL PAID: Rs 180.00", 40, 330);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#334155";
    ctx.fillText("Paid via UPI", 40, 380);
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      mimeType: "image/jpeg",
      label: "Uber Auto Receipt (₹180)",
    };
  }

  ctx.fillText("BLUE TOKAI COFFEE ROASTERS", 40, 60);
  ctx.font = "16px monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText("Date: 2026-10-08  16:30 IST", 40, 100);
  ctx.fillText("------------------------------------", 40, 140);
  ctx.fillStyle = "#0f172a";
  ctx.fillText("1x Iced Vietnamese Latte       Rs 220", 40, 180);
  ctx.fillText("1x Sourdough Mushroom Toast    Rs 120", 40, 215);
  ctx.fillText("------------------------------------", 40, 260);
  ctx.font = "bold 22px monospace";
  ctx.fillText("TOTAL PAID: Rs 340.00", 40, 305);
  ctx.font = "16px monospace";
  ctx.fillStyle = "#334155";
  ctx.fillText("Payment Method: Card", 40, 355);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.9),
    mimeType: "image/jpeg",
    label: "Blue Tokai Cafe Bill (₹340)",
  };
}
