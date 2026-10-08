import React, { useState, useEffect } from "react";
import {
  Home,
  Clock,
  Sparkles,
  User,
  Plus,
} from "lucide-react";
import {
  AIInsightData,
  Expense,
  ExpenseCategory,
  ScreenId,
  UserPreferences,
} from "./types";
import {
  INITIAL_AI_INSIGHTS,
  INITIAL_EXPENSES,
  INITIAL_PREFERENCES,
} from "./data/initialData";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { AddExpenseScreen } from "./components/AddExpenseScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { InsightsScreen } from "./components/InsightsScreen";
import { ProfileScreen } from "./components/ProfileScreen";

const STORAGE_KEYS = {
  EXPENSES: "spendai_expenses_v1",
  PREFS: "spendai_preferences_v1",
  INSIGHTS: "spendai_insights_v1",
};

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_EXPENSES;
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREFS);
      if (saved) {
        return { ...INITIAL_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PREFERENCES;
  });

  const [aiInsights, setAiInsights] = useState<AIInsightData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INSIGHTS);
      if (saved) {
        return { ...INITIAL_AI_INSIGHTS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_AI_INSIGHTS;
  });

  const [activeScreen, setActiveScreen] = useState<ScreenId>("dashboard");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<
    ExpenseCategory | "All"
  >("All");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch {
      // ignore storage errors
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(preferences));
    } catch {
      // ignore storage errors
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INSIGHTS, JSON.stringify(aiInsights));
    } catch {
      // ignore storage errors
    }
  }, [aiInsights]);

  const handleNavigate = (screen: ScreenId) => {
    if (screen !== "add") {
      setEditingExpense(null);
    }
    if (screen !== "history") {
      setHistoryCategoryFilter("All");
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCompleteOnboarding = (name: string, budget: number) => {
    setPreferences((prev) => ({
      ...prev,
      userName: name,
      monthlyBudget: budget,
      hasCompletedOnboarding: true,
    }));
    setActiveScreen("dashboard");
  };

  const handleSaveExpense = (
    expenseData: Omit<Expense, "id">,
    existingId?: string
  ) => {
    if (existingId) {
      setExpenses((prev) =>
        prev.map((item) =>
          item.id === existingId ? { ...expenseData, id: existingId } : item
        )
      );
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
    setEditingExpense(null);
    setActiveScreen("dashboard");
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setActiveScreen("add");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSelectCategoryFromDashboard = (category: ExpenseCategory) => {
    setHistoryCategoryFilter(category);
    setActiveScreen("history");
  };

  const handleUpdatePreferences = (updated: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updated }));
  };

  const handleSetCategoryGoal = (category: ExpenseCategory, amount: number) => {
    setPreferences((prev) => ({
      ...prev,
      categoryGoals: {
        ...prev.categoryGoals,
        [category]: amount,
      },
    }));
  };

  const handleResetDemoData = () => {
    setExpenses(INITIAL_EXPENSES);
    setPreferences({ ...INITIAL_PREFERENCES, hasCompletedOnboarding: true });
    setAiInsights(INITIAL_AI_INSIGHTS);
  };

  const handleLogout = () => {
    setPreferences((prev) => ({ ...prev, hasCompletedOnboarding: false }));
    setActiveScreen("onboarding");
  };

  const navItems: Array<{ id: ScreenId; label: string }> = [
    { id: "dashboard", label: "Home" },
    { id: "history", label: "History" },
    { id: "insights", label: "Insights" },
    { id: "profile", label: "Profile" },
    { id: "onboarding", label: "Welcome" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 (Single text wordmark) — Zone 2 (Clean text nav links) — Zone 3 (Primary action) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate("dashboard");
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          SpendAI
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          aria-label="Primary Navigation"
        >
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate(item.id);
                }}
                className={`py-1 transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-indigo-600 font-semibold underline underline-offset-8 decoration-2 decoration-indigo-600"
                    : "text-slate-600 hover:text-slate-900 hover:underline underline-offset-8"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleNavigate("add")}
            className="min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add Expense</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12">
        {activeScreen === "onboarding" && (
          <OnboardingScreen
            userName={preferences.userName}
            monthlyBudget={preferences.monthlyBudget}
            currency={preferences.currency}
            onComplete={handleCompleteOnboarding}
          />
        )}

        {activeScreen === "dashboard" && (
          <DashboardScreen
            expenses={expenses}
            preferences={preferences}
            aiInsights={aiInsights}
            onNavigate={handleNavigate}
            onSelectCategoryFilter={handleSelectCategoryFromDashboard}
          />
        )}

        {activeScreen === "add" && (
          <AddExpenseScreen
            preferences={preferences}
            editingExpense={editingExpense}
            onSaveExpense={handleSaveExpense}
            onCancel={() => handleNavigate("dashboard")}
          />
        )}

        {activeScreen === "history" && (
          <HistoryScreen
            expenses={expenses}
            preferences={preferences}
            initialCategoryFilter={historyCategoryFilter}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onNavigate={handleNavigate}
          />
        )}

        {activeScreen === "insights" && (
          <InsightsScreen
            expenses={expenses}
            preferences={preferences}
            aiInsights={aiInsights}
            onUpdateInsights={setAiInsights}
            onSetCategoryGoal={handleSetCategoryGoal}
          />
        )}

        {activeScreen === "profile" && (
          <ProfileScreen
            preferences={preferences}
            expenses={expenses}
            onUpdatePreferences={handleUpdatePreferences}
            onResetDemoData={handleResetDemoData}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Home | History | Insights | Profile) */}
      {activeScreen !== "onboarding" && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden grid grid-cols-4 items-center h-15 px-2"
          aria-label="Mobile Bottom Navigation"
        >
          {(
            [
              { id: "dashboard", label: "Home", Icon: Home },
              { id: "history", label: "History", Icon: Clock },
              { id: "insights", label: "Insights", Icon: Sparkles },
              { id: "profile", label: "Profile", Icon: User },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = activeScreen === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigate(id)}
                className={`min-h-[44px] flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
                  active
                    ? "text-indigo-600 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
                <span className="text-[11px] tracking-tight mt-0.5 whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
