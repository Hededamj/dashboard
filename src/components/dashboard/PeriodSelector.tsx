"use client";

import { Calendar } from "lucide-react";

export type PeriodType = "7days" | "4weeks" | "thisMonth" | "custom";

interface PeriodSelectorProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <Calendar className="h-5 w-5 text-gray-500" />
      <span className="text-sm text-gray-600">Vis:</span>
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as PeriodType)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="7days">Sidste 7 dage vs. forrige 7 dage</option>
        <option value="4weeks">Sidste 4 uger vs. forrige 4 uger</option>
        <option value="thisMonth">Denne måned vs. sidste måned</option>
      </select>
    </div>
  );
}
