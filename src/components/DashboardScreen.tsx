import React from "react";
import {
  Plus,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  AIInsightData,
  Expense,
  ExpenseCategory,
  ScreenId,
  UserPreferences,
} from "../types";
import { CURRENT_DATE, CURRENT_MONTH_PREFIX } from "../data/initialData";
import { formatCurrency } from "../utils/smartParser";
import { CategoryIcon, CATEGORY_META } from "./CategoryIcon";

interface DashboardScreenProps {
  expenses: Expense[];
  preferences: UserPreferences;
  aiInsights: AIInsightData;
  onNavigate: (screen: ScreenId) => void;
  onSelectCategoryFilter: (category: ExpenseCategory) => void;
}

const ORDERED_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Other",
];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  expenses,
  preferences,
  aiInsights,
  onNavigate,
  onSelectCategoryFilter,
}) => {
  const { userName, monthlyBudget, currency, spendingAlerts, alertThresholdPercent } =
    preferences;

  // Filter October 2026 expenses
  const monthlyExpenses = expenses.filter((e) =>
    e.date.startsWith(CURRENT_MONTH_PREFIX)
  );

  const totalMonthSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const todaySpent = monthlyExpenses
    .filter((e) => e.date === CURRENT_DATE)
    .reduce((sum, e) => sum + e.amount, 0);

  // Average daily spending across the 30-day monthly budget period (₹18,450 / 30 = ₹615)
  const averageDaily = Math.round(totalMonthSpent / 30);

  const remainingBudget = monthlyBudget - totalMonthSpent;
  const budgetPercent =
    monthlyBudget > 0
      ? Math.min(100, Math.round((totalMonthSpent / monthlyBudget) * 100))
      : 0;

  const isOverBudget = totalMonthSpent > monthlyBudget;
  const isApproachingLimit =
    !isOverBudget && budgetPercent >= (alertThresholdPercent || 70);

  // Compute totals per category
  const categoryTotals: Record<ExpenseCategory, number> = {
    Food: 0,
    Shopping: 0,
    Travel: 0,
    Bills: 0,
    Other: 0,
  };

  for (const exp of monthlyExpenses) {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + exp.amount;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Greeting & Quick Add Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>October 2026</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
            Good morning, {userName}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("add")}
          className="min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-sm transition-all inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Conditional Budget Alert Banner */}
      {spendingAlerts && (isOverBudget || isApproachingLimit) && (
        <div
          className={`rounded-2xl p-4 border flex items-start justify-between gap-3 ${
            isOverBudget
              ? "bg-red-50/90 border-red-200 text-red-900"
              : "bg-amber-50/90 border-amber-200 text-amber-900"
          }`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className={`mt-0.5 shrink-0 ${
                isOverBudget ? "text-red-600" : "text-amber-600"
              }`}
            />
            <div className="text-xs sm:text-sm space-y-0.5">
              <p className="font-semibold">
                {isOverBudget
                  ? `Budget exceeded by ${formatCurrency(
                      Math.abs(remainingBudget),
                      currency
                    )}`
                  : `You've used ${budgetPercent}% of your October budget`}
              </p>
              <p className={isOverBudget ? "text-red-700" : "text-amber-800"}>
                {isOverBudget
                  ? "Review your recent dining or shopping expenses to rebalance."
                  : `${formatCurrency(
                      Math.max(0, remainingBudget),
                      currency
                    )} remaining for the rest of October.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="text-xs font-semibold underline shrink-0 whitespace-nowrap py-1 px-2"
          >
            Edit Budget
          </button>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols on desktop): Total Spent, Budget Progress, Today & Average */}
        <div className="lg:col-span-7 space-y-6">
          {/* Primary Monthly Spending & Budget Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Total spent this month
                </p>
                <p className="text-3xl sm:text-4xl font-bold font-mono-tabular tracking-tight text-slate-900 mt-1">
                  {formatCurrency(totalMonthSpent, currency)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500">Remaining budget</p>
                <p
                  className={`text-base font-bold font-mono-tabular mt-0.5 ${
                    remainingBudget < 0
                      ? "text-red-600"
                      : remainingBudget < monthlyBudget * 0.2
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {remainingBudget >= 0
                    ? `${formatCurrency(remainingBudget, currency)} left`
                    : `${formatCurrency(Math.abs(remainingBudget), currency)} over`}
                </p>
              </div>
            </div>

            {/* Budget Progress Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Budget</span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatCurrency(totalMonthSpent, currency)}{" "}
                  <span className="text-slate-400 font-normal">/</span>{" "}
                  {formatCurrency(monthlyBudget, currency)}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverBudget
                      ? "bg-red-600"
                      : budgetPercent >= 80
                      ? "bg-amber-500"
                      : "bg-indigo-600"
                  }`}
                  style={{ width: `${Math.min(100, budgetPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{budgetPercent}% of monthly budget used</span>
                <button
                  type="button"
                  onClick={() => onNavigate("profile")}
                  className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  Adjust limit
                </button>
              </div>
            </div>

            {/* Today & Average Stat Pair */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Today (Oct 8)</p>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                  {formatCurrency(todaySpent, currency)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {
                    monthlyExpenses.filter((e) => e.date === CURRENT_DATE)
                      .length
                  }{" "}
                  transactions today
                </p>
              </div>

              <div className="border-l border-slate-100 pl-4">
                <p className="text-xs text-slate-500">Average / day</p>
                <p className="text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900 mt-1">
                  {formatCurrency(averageDaily, currency)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: {formatCurrency(Math.round(monthlyBudget / 30), currency)}/day
                </p>
              </div>
            </div>
          </div>

          {/* Compact AI Insight Card */}
          <div className="bg-white border border-indigo-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-indigo-700 font-semibold">
                  <span>AI Insight</span>
                  <span aria-hidden="true">·</span>
                  <span>October Analysis</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {aiInsights.dashboardBanner}
                </p>
                <p className="text-xs text-slate-600">
                  {aiInsights.recommendationBody}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("insights")}
              className="min-h-[40px] px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
            >
              <span>View Insights</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols on desktop): Spending by Category & Recent Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* Spending by Category */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Spending by Category
              </h2>
              <button
                type="button"
                onClick={() => onNavigate("history")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {ORDERED_CATEGORIES.map((cat) => {
                const amount = categoryTotals[cat] || 0;
                const pct =
                  totalMonthSpent > 0
                    ? Math.round((amount / totalMonthSpent) * 100)
                    : 0;
                const meta = CATEGORY_META[cat];
                const goalLimit = preferences.categoryGoals?.[cat];

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategoryFilter(cat)}
                    className="w-full py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 rounded-lg px-1.5 -mx-1.5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CategoryIcon category={cat} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {cat}
                          </span>
                          <span className="text-sm font-bold font-mono-tabular text-slate-900">
                            {formatCurrency(amount, currency)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${meta.barClass}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono-tabular text-slate-500 w-9 text-right">
                            {pct}%
                          </span>
                        </div>

                        {goalLimit && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Goal: {formatCurrency(goalLimit, currency)}
                            {amount > goalLimit
                              ? ` (${formatCurrency(
                                  amount - goalLimit,
                                  currency
                                )} over goal)`
                              : ` (${formatCurrency(
                                  goalLimit - amount,
                                  currency
                                )} under goal)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-400 group-hover:text-slate-700 shrink-0"
                    />
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp size={14} className="text-indigo-600" />
                Highest spend:{" "}
                <strong className="text-slate-800">
                  {
                    ORDERED_CATEGORIES.slice().sort(
                      (a, b) => categoryTotals[b] - categoryTotals[a]
                    )[0]
                  }
                </strong>
              </span>
              <button
                type="button"
                onClick={() => onNavigate("add")}
                className="font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Quick log
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
