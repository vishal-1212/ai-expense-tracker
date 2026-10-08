import React, { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  X,
  Loader2,
} from "lucide-react";
import {
  Expense,
  ExpenseCategory,
  ScreenId,
  UserPreferences,
} from "../types";
import { formatCurrency } from "../utils/smartParser";
import { CategoryIcon } from "./CategoryIcon";

interface HistoryScreenProps {
  expenses: Expense[];
  preferences: UserPreferences;
  initialCategoryFilter?: ExpenseCategory | "All";
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

const FILTER_OPTIONS: Array<ExpenseCategory | "All"> = [
  "All",
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Other",
];

function formatDateHeading(dateStr: string): string {
  if (dateStr === "2026-10-08") return "October 8 (Today)";
  if (dateStr === "2026-10-07") return "October 7 (Yesterday)";
  const parsed = new Date(dateStr + "T12:00:00");
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: parsed.getFullYear() !== 2026 ? "numeric" : undefined,
  });
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  expenses,
  preferences,
  initialCategoryFilter = "All",
  onEditExpense,
  onDeleteExpense,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ExpenseCategory | "All"
  >(initialCategoryFilter);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [aiSearchSummary, setAiSearchSummary] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Sync external category filter if updated from Dashboard
  React.useEffect(() => {
    setSelectedCategory(initialCategoryFilter);
  }, [initialCategoryFilter]);

  const handleAiSmartSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsAiSearching(true);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, expenses }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.matchingIds)) {
        setAiMatchedIds(data.matchingIds);
        setAiSearchSummary(data.summary || `Matched ${data.matchingIds.length} expenses`);
      }
    } catch {
      // Fallback to client-side search if offline
      setAiMatchedIds(null);
    } finally {
      setIsAiSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setAiMatchedIds(null);
    setAiSearchSummary(null);
  };

  // Filter expenses by category + search query (or AI matched IDs)
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (selectedCategory !== "All" && exp.category !== selectedCategory) {
          return false;
        }
        if (aiMatchedIds !== null) {
          return aiMatchedIds.includes(exp.id);
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          exp.description.toLowerCase().includes(q) ||
          exp.category.toLowerCase().includes(q) ||
          exp.subcategory.toLowerCase().includes(q) ||
          exp.paymentMethod.toLowerCase().includes(q) ||
          String(exp.amount).includes(q) ||
          exp.date.includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, selectedCategory, searchQuery, aiMatchedIds]);

  // Group filtered expenses by date
  const groupedByDate = useMemo(() => {
    const groups: Array<{ date: string; items: Expense[]; dayTotal: number }> =
      [];
    const map = new Map<string, Expense[]>();

    for (const exp of filteredExpenses) {
      const existing = map.get(exp.date);
      if (existing) {
        existing.push(exp);
      } else {
        map.set(exp.date, [exp]);
      }
    }

    for (const [date, items] of map.entries()) {
      const dayTotal = items.reduce((s, i) => s + i.amount, 0);
      groups.push({ date, items, dayTotal });
    }
    return groups;
  }, [filteredExpenses]);

  const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Expenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            <span>{filteredExpenses.length} transactions</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono-tabular font-semibold text-slate-700">
              {formatCurrency(filteredTotal, preferences.currency)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("add")}
          className="min-h-[44px] px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <Plus size={17} />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Search Bar + Optional AI Natural Language Search */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (aiMatchedIds !== null) {
                  setAiMatchedIds(null);
                  setAiSearchSummary(null);
                }
              }}
              placeholder="Search merchant, amount, date, or ask AI (e.g. 'food over ₹200')"
              aria-label="Search expenses"
              className="w-full h-11 pl-10 pr-9 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {searchQuery.trim().length > 2 && (
            <button
              type="button"
              onClick={handleAiSmartSearch}
              disabled={isAiSearching}
              className="h-11 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            >
              {isAiSearching ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span>AI Filter</span>
            </button>
          )}
        </div>

        {aiSearchSummary && (
          <div className="flex items-center justify-between text-xs text-indigo-700 bg-indigo-50/70 px-3 py-2 rounded-lg">
            <span>{aiSearchSummary}</span>
            <button
              type="button"
              onClick={clearSearch}
              className="font-semibold underline ml-2 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        )}

        {/* Interactive Filter Segmented Control */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter expenses by category"
        >
          {FILTER_OPTIONS.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date-Grouped Expense List */}
      {groupedByDate.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">
            No matching expenses found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try clearing your search filter or add a new expense to start
            tracking your spending.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            {(searchQuery || selectedCategory !== "All") && (
              <button
                type="button"
                onClick={() => {
                  clearSearch();
                  setSelectedCategory("All");
                }}
                className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate("add")}
              className="min-h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              + Add Expense
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map((group) => (
            <div
              key={group.date}
              className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden"
            >
              {/* Date Group Header */}
              <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700">
                  {formatDateHeading(group.date)}
                </h2>
                <span className="text-xs font-mono-tabular font-semibold text-slate-600">
                  {formatCurrency(group.dayTotal, preferences.currency)}
                </span>
              </div>

              {/* Expense Rows */}
              <div className="divide-y divide-slate-100">
                {group.items.map((exp) => (
                  <div
                    key={exp.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <CategoryIcon category={exp.category} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {exp.description}
                        </p>
                        {/* Clean unboxed metadata with typographic separators */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                          <span>{exp.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{exp.subcategory}</span>
                          <span aria-hidden="true">·</span>
                          <span>{exp.paymentMethod}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm sm:text-base font-bold font-mono-tabular text-slate-900">
                        {formatCurrency(exp.amount, preferences.currency)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditExpense(exp)}
                          aria-label={`Edit ${exp.description}`}
                          className="min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          aria-label={`Delete ${exp.description}`}
                          className="min-w-[36px] min-h-[36px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
