import React, { useState, useRef } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw,
  Volume2,
  Square,
  Check,
  Loader2,
} from "lucide-react";
import {
  AIInsightData,
  Expense,
  ExpenseCategory,
  UserPreferences,
} from "../types";
import {
  CURRENT_MONTH_PREFIX,
  PREVIOUS_MONTH_FOOD,
  PREVIOUS_MONTH_TOTAL,
} from "../data/initialData";
import { formatCurrency } from "../utils/smartParser";
import { CategoryIcon, CATEGORY_META } from "./CategoryIcon";

interface InsightsScreenProps {
  expenses: Expense[];
  preferences: UserPreferences;
  aiInsights: AIInsightData;
  onUpdateInsights: (insights: AIInsightData) => void;
  onSetCategoryGoal: (category: ExpenseCategory, amount: number) => void;
}

const ORDERED_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Other",
];

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  expenses,
  preferences,
  aiInsights,
  onUpdateInsights,
  onSetCategoryGoal,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [goalSavedBanner, setGoalSavedBanner] = useState(false);
  const [customGoalAmount, setCustomGoalAmount] = useState<string>(
    String(aiInsights.suggestedGoalAmount || 4500)
  );
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const monthlyExpenses = expenses.filter((e) =>
    e.date.startsWith(CURRENT_MONTH_PREFIX)
  );
  const totalMonthSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Month-over-Month comparison against September (₹16,470)
  const momDelta = totalMonthSpent - PREVIOUS_MONTH_TOTAL;
  const momPercent =
    PREVIOUS_MONTH_TOTAL > 0
      ? Math.round((momDelta / PREVIOUS_MONTH_TOTAL) * 100)
      : 0;

  // Category breakdown
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

  // Dynamic food delta for accuracy
  const foodSpent = categoryTotals.Food || 0;
  const foodMoreThanSept = Math.max(0, foodSpent - PREVIOUS_MONTH_FOOD);
  const twentyPercentFoodSaving = Math.round(foodSpent * 0.2);

  // Refresh AI Insights from server (/api/ai/insights)
  const handleRefreshAiInsights = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenses: monthlyExpenses,
          monthlyBudget: preferences.monthlyBudget,
          previousMonthTotal: PREVIOUS_MONTH_TOTAL,
          previousFoodTotal: PREVIOUS_MONTH_FOOD,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not refresh AI insights.");
      }
      onUpdateInsights(data);
      if (data.suggestedGoalAmount) {
        setCustomGoalAmount(String(data.suggestedGoalAmount));
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Failed to refresh live insights. Showing latest analysis."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Text-to-Speech Audio Briefing (/api/ai/tts)
  const handleListenToBriefing = async () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }

    setIsSynthesizingAudio(true);
    setErrorMsg(null);
    try {
      const summaryScript = `Hi ${preferences.userName}. Your October spending so far is ${totalMonthSpent} rupees, which is ${Math.abs(
        momPercent
      )} percent ${momPercent >= 0 ? "higher" : "lower"} than September. ${
        aiInsights.recommendationHeadline
      } ${aiInsights.recommendationBody} ${aiInsights.suggestedGoalText}`;

      const response = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: summaryScript }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioDataUrl) {
        throw new Error(data.error || "Could not generate audio briefing.");
      }

      const audio = new Audio(data.audioDataUrl);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
      setIsPlayingAudio(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Audio playback unavailable.");
    } finally {
      setIsSynthesizingAudio(false);
    }
  };

  const activeGoalForSuggestedCategory =
    preferences.categoryGoals?.[aiInsights.suggestedGoalCategory];

  const handleApplyGoal = () => {
    const parsedAmount =
      parseInt(customGoalAmount.replace(/,/g, ""), 10) ||
      aiInsights.suggestedGoalAmount ||
      4500;
    onSetCategoryGoal(aiInsights.suggestedGoalCategory, parsedAmount);
    setIsEditingGoal(false);
    setGoalSavedBanner(true);
    setTimeout(() => setGoalSavedBanner(false), 3500);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & AI Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <Sparkles size={14} />
            <span>AI Financial Analysis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-0.5">
            AI Financial Insights
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleListenToBriefing}
            disabled={isSynthesizingAudio}
            className="min-h-[42px] px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {isSynthesizingAudio ? (
              <Loader2 size={14} className="animate-spin text-indigo-600" />
            ) : isPlayingAudio ? (
              <Square size={14} className="text-red-600" />
            ) : (
              <Volume2 size={14} className="text-indigo-600" />
            )}
            <span>
              {isSynthesizingAudio
                ? "Generating Audio..."
                : isPlayingAudio
                ? "Stop Audio"
                : "Listen to Briefing"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRefreshAiInsights}
            disabled={isRefreshing}
            className="min-h-[42px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              size={14}
              className={isRefreshing ? "animate-spin" : ""}
            />
            <span>{isRefreshing ? "Analyzing..." : "Refresh AI Insights"}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: October Spending Overview + AI Recommendation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Your October Spending & Month-over-Month Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Your October Spending
                </p>
                <p className="text-3xl sm:text-4xl font-bold font-mono-tabular tracking-tight text-slate-900 mt-1">
                  {formatCurrency(totalMonthSpent, preferences.currency)}
                </p>
              </div>

              <div className="sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <p className="text-xs text-slate-500">
                  Compared with September (
                  {formatCurrency(PREVIOUS_MONTH_TOTAL, preferences.currency)})
                </p>
                <div
                  className={`inline-flex items-center gap-1.5 text-base font-bold font-mono-tabular mt-1 ${
                    momPercent > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {momPercent >= 0 ? (
                    <TrendingUp size={17} />
                  ) : (
                    <TrendingDown size={17} />
                  )}
                  <span>
                    {momPercent >= 0 ? `↑ ${momPercent}%` : `↓ ${Math.abs(momPercent)}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div className="bg-white border border-indigo-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                <Sparkles size={15} />
                <span>AI Recommendation</span>
              </div>
              <span className="text-xs font-mono-tabular font-semibold text-emerald-700">
                Potential savings:{" "}
                {formatCurrency(
                  aiInsights.potentialMonthlySavings || twentyPercentFoodSaving,
                  preferences.currency
                )}
                /mo
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {aiInsights.recommendationHeadline ||
                  `You spent ${formatCurrency(
                    foodMoreThanSept,
                    preferences.currency
                  )} more on food this month.`}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {aiInsights.recommendationBody ||
                  `Reducing food spending by 20% could save approximately ${formatCurrency(
                    twentyPercentFoodSaving,
                    preferences.currency
                  )} this month.`}
              </p>
            </div>

            {/* Observations List */}
            {aiInsights.observations && aiInsights.observations.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Key Patterns Detected by SpendAI
                </p>
                <ul className="space-y-2">
                  {aiInsights.observations.map((obs, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed"
                    >
                      <span className="text-indigo-600 font-bold mt-0.5">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Suggested Goal Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Target size={16} className="text-indigo-600" />
                <span>Suggested Goal</span>
              </div>
              {activeGoalForSuggestedCategory && (
                <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                  <Check size={13} />
                  Active goal:{" "}
                  {formatCurrency(
                    activeGoalForSuggestedCategory,
                    preferences.currency
                  )}
                </span>
              )}
            </div>

            <p className="text-base font-semibold text-slate-900">
              {aiInsights.suggestedGoalText ||
                "Try keeping food expenses below ₹4,500 next month."}
            </p>

            {goalSavedBanner && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <Check size={14} className="text-emerald-600" />
                <span>
                  Goal saved! We’ll track your{" "}
                  {aiInsights.suggestedGoalCategory} spending against{" "}
                  {formatCurrency(
                    parseInt(customGoalAmount, 10) || 4500,
                    preferences.currency
                  )}
                  .
                </span>
              </div>
            )}

            {isEditingGoal ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono-tabular text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={500}
                    step={100}
                    value={customGoalAmount}
                    onChange={(e) => setCustomGoalAmount(e.target.value)}
                    className="w-full h-11 pl-8 pr-3 text-sm font-mono-tabular bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyGoal}
                  className="min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  Confirm Goal
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleApplyGoal}
                  className="min-h-[44px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  Set Goal (
                  {formatCurrency(
                    parseInt(customGoalAmount, 10) ||
                      aiInsights.suggestedGoalAmount ||
                      4500,
                    preferences.currency
                  )}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(true)}
                  className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Customize Target
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Spending Patterns Breakdown */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Spending Patterns
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Category share of your October spending
              </p>
            </div>

            {/* Stacked Multi-Segment Progress Bar */}
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
              {ORDERED_CATEGORIES.map((cat) => {
                const amount = categoryTotals[cat] || 0;
                const pct =
                  totalMonthSpent > 0 ? (amount / totalMonthSpent) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={cat}
                    className={`h-full ${CATEGORY_META[cat].barClass} first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${pct}%` }}
                    title={`${cat}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </div>

            {/* Detailed Category Breakdown List */}
            <div className="divide-y divide-slate-100">
              {ORDERED_CATEGORIES.map((cat) => {
                const amount = categoryTotals[cat] || 0;
                const pct =
                  totalMonthSpent > 0
                    ? Math.round((amount / totalMonthSpent) * 100)
                    : 0;
                const meta = CATEGORY_META[cat];
                return (
                  <div
                    key={cat}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon category={cat} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {cat}
                        </p>
                        <p className="text-xs text-slate-500">
                          {
                            monthlyExpenses.filter((e) => e.category === cat)
                              .length
                          }{" "}
                          entries
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold font-mono-tabular text-slate-900">
                        { pct }%
                      </p>
                      <p className="text-xs font-mono-tabular text-slate-500">
                        {formatCurrency(amount, preferences.currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Highest vs Lowest Summary Footer */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Highest category</span>
                <span className="font-semibold text-slate-900">
                  Food ({formatCurrency(categoryTotals.Food, preferences.currency)})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Remaining October budget</span>
                <span className="font-mono-tabular font-semibold text-emerald-700">
                  {formatCurrency(
                    Math.max(0, preferences.monthlyBudget - totalMonthSpent),
                    preferences.currency
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
