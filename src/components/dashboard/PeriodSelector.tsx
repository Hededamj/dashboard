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
    <div className="flex items-center gap-3 bg-card border-2 border-border px-6 py-4 hover:border-primary/50 transition-colors">
      <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Calendar className="h-5 w-5 text-primary" strokeWidth={2.5} />
      </div>
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as PeriodType)}
        className="flex-1 px-4 py-3 border-2 border-border bg-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer hover:border-primary/50 transition-colors"
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
