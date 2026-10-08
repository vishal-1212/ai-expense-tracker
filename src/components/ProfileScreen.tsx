import React, { useState } from "react";
import {
  Download,
  LogOut,
  Check,
  RotateCcw,
  Sliders,
  Bell,
  Sparkles,
  User,
} from "lucide-react";
import { Expense, UserPreferences } from "../types";
import { formatCurrency } from "../utils/smartParser";

interface ProfileScreenProps {
  preferences: UserPreferences;
  expenses: Expense[];
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onResetDemoData: () => void;
  onLogout: () => void;
}

const BUDGET_PRESETS = [15000, 20000, 25000, 30000, 40000];

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  preferences,
  expenses,
  onUpdatePreferences,
  onResetDemoData,
  onLogout,
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(
    String(preferences.monthlyBudget)
  );
  const [nameDraft, setNameDraft] = useState(preferences.userName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Math.max(1000, parseInt(budgetDraft.replace(/,/g, ""), 10) || 25000);
    onUpdatePreferences({ monthlyBudget: num });
    setBudgetDraft(String(num));
    setIsEditingBudget(false);
    showToast(`Monthly budget updated to ${formatCurrency(num, preferences.currency)}`);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameDraft.trim() || "Vishal";
    onUpdatePreferences({ userName: cleaned });
    setNameDraft(cleaned);
    setIsEditingName(false);
    showToast(`Profile name updated to ${cleaned}`);
  };

  const handleExportCsv = () => {
    const headers = [
      "Date",
      "Description",
      "Category",
      "Subcategory",
      "Payment Method",
      "Amount",
    ];
    const rows = expenses.map((e) => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      `"${e.subcategory.replace(/"/g, '""')}"`,
      e.paymentMethod,
      e.amount,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "spendai-expenses-october-2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${expenses.length} expenses to CSV`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your monthly budget, currency, and AI preferences
        </p>
      </div>

      {savedNotice && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* User Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {preferences.userName}
              </p>
              <p className="text-xs text-slate-500">
                SpendAI Personal Workspace · October 2026
              </p>
            </div>
          </div>

          {!isEditingName && (
            <button
              type="button"
              onClick={() => setIsEditingName(true)}
              className="min-h-[38px] px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Edit Name
            </button>
          )}
        </div>

        {isEditingName && (
          <form onSubmit={handleSaveName} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              type="submit"
              className="px-4 h-10 bg-indigo-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="px-3 h-10 bg-slate-100 text-slate-700 text-xs font-medium rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Monthly Budget & Currency Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Sliders size={13} />
              <span>Monthly Budget</span>
            </p>
            <p className="text-2xl sm:text-3xl font-bold font-mono-tabular text-slate-900 mt-1">
              {formatCurrency(preferences.monthlyBudget, preferences.currency)}
            </p>
          </div>

          {!isEditingBudget && (
            <button
              type="button"
              onClick={() => {
                setBudgetDraft(String(preferences.monthlyBudget));
                setIsEditingBudget(true);
              }}
              className="min-h-[42px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Edit Budget
            </button>
          )}
        </div>

        {isEditingBudget && (
          <form
            onSubmit={handleSaveBudget}
            className="pt-4 border-t border-slate-100 space-y-3"
          >
            <label
              htmlFor="budget-edit-input"
              className="block text-xs font-semibold text-slate-700"
            >
              Set New Monthly Budget
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="budget-edit-input"
                type="number"
                min={1000}
                step={500}
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
                className="flex-1 h-11 px-3.5 text-base font-mono-tabular font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="submit"
                className="min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap"
              >
                Save Budget
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="min-h-[44px] px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BUDGET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBudgetDraft(String(preset))}
                  className="px-2.5 py-1 text-xs font-mono-tabular bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  {formatCurrency(preset, preferences.currency)}
                </button>
              ))}
            </div>
          </form>
        )}

        {/* Currency Row */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Currency</p>
            <p className="text-xs text-slate-500">
              Primary display currency for all amounts
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(
              [
                { code: "INR", label: "₹ INR" },
                { code: "USD", label: "$ USD" },
                { code: "EUR", label: "€ EUR" },
              ] as const
            ).map((curr) => (
              <button
                key={curr.code}
                type="button"
                onClick={() => {
                  onUpdatePreferences({ currency: curr.code });
                  showToast(`Currency set to ${curr.label}`);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  preferences.currency === curr.code
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {curr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications & AI Preferences Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Bell size={13} />
            <span>Notifications</span>
          </h2>

          {/* Spending Alerts Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Spending Alerts
              </p>
              <p className="text-xs text-slate-500">
                Warn on dashboard when monthly spending exceeds{" "}
                {preferences.alertThresholdPercent || 70}% of budget
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.spendingAlerts}
              onClick={() =>
                onUpdatePreferences({
                  spendingAlerts: !preferences.spendingAlerts,
                })
              }
              className={`w-12 h-7 rounded-full transition-colors p-1 cursor-pointer shrink-0 ${
                preferences.spendingAlerts ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  preferences.spendingAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Weekly AI Summary Toggle */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Weekly AI Summary
              </p>
              <p className="text-xs text-slate-500">
                Receive weekly category comparisons and saving tips
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.weeklyAiSummary}
              onClick={() =>
                onUpdatePreferences({
                  weeklyAiSummary: !preferences.weeklyAiSummary,
                })
              }
              className={`w-12 h-7 rounded-full transition-colors p-1 cursor-pointer shrink-0 ${
                preferences.weeklyAiSummary ? "bg-indigo-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  preferences.weeklyAiSummary
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* AI Preferences Section */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>AI Preferences</span>
          </h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Smart Categorization
              </p>
              <p className="text-xs text-slate-500">
                Automatically detect category, subcategory, and amount as you
                type
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.smartCategorization}
              onClick={() =>
                onUpdatePreferences({
                  smartCategorization: !preferences.smartCategorization,
                })
              }
              className={`w-12 h-7 rounded-full transition-colors p-1 cursor-pointer shrink-0 ${
                preferences.smartCategorization
                  ? "bg-indigo-600"
                  : "bg-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  preferences.smartCategorization
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Export & Account Actions */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-3">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download size={15} />
          <span>Export Expenses (CSV)</span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              onResetDemoData();
              showToast("Restored default October 2026 demo expenses");
            }}
            className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
