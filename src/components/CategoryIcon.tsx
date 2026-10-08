import React from "react";
import {
  Utensils,
  ShoppingBag,
  Car,
  Smartphone,
  Layers,
} from "lucide-react";
import { ExpenseCategory } from "../types";

export const CATEGORY_META: Record<
  ExpenseCategory,
  {
    label: string;
    bgClass: string;
    textClass: string;
    barClass: string;
    defaultSubcategories: string[];
  }
> = {
  Food: {
    label: "Food",
    bgClass: "bg-indigo-50 text-indigo-700",
    textClass: "text-indigo-700",
    barClass: "bg-indigo-600",
    defaultSubcategories: ["Dining", "Coffee & Snacks", "Groceries", "Delivery"],
  },
  Shopping: {
    label: "Shopping",
    bgClass: "bg-violet-50 text-violet-700",
    textClass: "text-violet-700",
    barClass: "bg-violet-600",
    defaultSubcategories: ["Apparel", "Electronics", "Personal Care", "Home"],
  },
  Travel: {
    label: "Travel",
    bgClass: "bg-sky-50 text-sky-700",
    textClass: "text-sky-700",
    barClass: "bg-sky-600",
    defaultSubcategories: ["Cab & Auto", "Metro & Bus", "Fuel", "Intercity"],
  },
  Bills: {
    label: "Bills",
    bgClass: "bg-amber-50 text-amber-700",
    textClass: "text-amber-700",
    barClass: "bg-amber-500",
    defaultSubcategories: ["Mobile & Wi-Fi", "Utilities", "Subscriptions", "Rent"],
  },
  Other: {
    label: "Other",
    bgClass: "bg-slate-100 text-slate-700",
    textClass: "text-slate-700",
    barClass: "bg-slate-500",
    defaultSubcategories: ["Fitness & Health", "Books & Study", "Entertainment", "General"],
  },
};

interface CategoryIconProps {
  category: ExpenseCategory;
  size?: "sm" | "md" | "lg";
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = "md",
}) => {
  const meta = CATEGORY_META[category] || CATEGORY_META.Other;
  const sizeClasses =
    size === "sm"
      ? "w-8 h-8 rounded-lg"
      : size === "lg"
      ? "w-11 h-11 rounded-xl"
      : "w-9 h-9 rounded-xl";
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;

  const renderIcon = () => {
    switch (category) {
      case "Food":
        return <Utensils size={iconSize} strokeWidth={2} />;
      case "Shopping":
        return <ShoppingBag size={iconSize} strokeWidth={2} />;
      case "Travel":
        return <Car size={iconSize} strokeWidth={2} />;
      case "Bills":
        return <Smartphone size={iconSize} strokeWidth={2} />;
      default:
        return <Layers size={iconSize} strokeWidth={2} />;
    }
  };

  return (
    <div
      className={`${sizeClasses} ${meta.bgClass} flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {renderIcon()}
    </div>
  );
};
