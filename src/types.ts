export type ExpenseCategory = "Food" | "Shopping" | "Travel" | "Bills" | "Other";

export type PaymentMethod = "UPI" | "Cash" | "Card";

export type ScreenId =
  | "onboarding"
  | "dashboard"
  | "add"
  | "history"
  | "insights"
  | "profile";

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  subcategory: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  aiCategorized?: boolean;
  reasoning?: string;
}

export interface AIInsightData {
  dashboardBanner: string;
  recommendationHeadline: string;
  recommendationBody: string;
  potentialMonthlySavings: number;
  suggestedGoalCategory: ExpenseCategory;
  suggestedGoalAmount: number;
  suggestedGoalText: string;
  observations: string[];
}

export interface UserPreferences {
  userName: string;
  monthlyBudget: number;
  currency: "INR" | "USD" | "EUR" | "GBP";
  spendingAlerts: boolean;
  alertThresholdPercent: number;
  weeklyAiSummary: boolean;
  smartCategorization: boolean;
  categoryGoals: Partial<Record<ExpenseCategory, number>>;
  hasCompletedOnboarding: boolean;
}
