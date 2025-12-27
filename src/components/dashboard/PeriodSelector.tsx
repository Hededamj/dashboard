"use client";

import { Calendar } from "lucide-react";

export type PeriodType =
  | "today"
  | "yesterday"
  | "last7days"
  | "last4weeks"
  | "last3months"
  | "last12months"
  | "monthToDate"
  | "lastMonth"
  | "yearToDate"
  | "allTime";

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-3 mb-6 bg-white px-4 py-3 rounded-lg border border-gray-200">
      <Calendar className="h-5 w-5 text-gray-500" />
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as PeriodType)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
      >
        <option value="today">I dag</option>
        <option value="yesterday">I går</option>
        <option value="last7days">Sidste 7 dage</option>
        <option value="last4weeks">Sidste 4 uger</option>
        <option value="last3months">Sidste 3 måneder</option>
        <option value="last12months">Sidste 12 måneder</option>
        <option value="monthToDate">Måned til dato</option>
        <option value="lastMonth">Sidste måned</option>
        <option value="yearToDate">År til dato</option>
        <option value="allTime">Alle tider</option>
      </select>
    </div>
  );
}
