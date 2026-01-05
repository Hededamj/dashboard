"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricComparison } from "@/types";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  comparison?: MetricComparison;
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description,
  trend = "neutral",
  comparison,
}: MetricCardProps) {
  const trendConfig = {
    up: {
      color: "text-secondary",
      borderColor: "border-secondary/30",
      bgGlow: "bg-secondary/5",
      icon: TrendingUp,
    },
    down: {
      color: "text-accent",
      borderColor: "border-accent/30",
      bgGlow: "bg-accent/5",
      icon: TrendingDown,
    },
    neutral: {
      color: "text-muted-foreground",
      borderColor: "border-border",
      bgGlow: "bg-muted/20",
      icon: Minus,
    },
  }[comparison?.trend || trend];

  const TrendIcon = trendConfig.icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        "bg-card border-2 transition-all duration-500",
        trendConfig.borderColor,
        "hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20",
        "animate-scale-in"
      )}
    >
      {/* Animated background glow */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          trendConfig.bgGlow
        )}
      />

      {/* Diagonal accent line */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full origin-top-right rotate-45",
            "bg-gradient-to-b from-primary to-transparent"
          )}
        />
      </div>

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              {title}
            </h3>
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded flex items-center justify-center",
              "bg-primary/10 border border-primary/20",
              "group-hover:bg-primary/20 transition-colors duration-300"
            )}
          >
            <Icon className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
        </div>

        {/* Value - large and bold with monospace font */}
        <div className="mb-4">
          <div className="text-4xl font-bold font-mono-data tracking-tight text-foreground">
            {value}
          </div>
        </div>

        {/* Comparison or Description */}
        {comparison ? (
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-sm",
                "bg-background/50 border",
                trendConfig.borderColor
              )}
            >
              <TrendIcon className={cn("h-3.5 w-3.5", trendConfig.color)} strokeWidth={2.5} />
              <span className={cn("text-sm font-bold font-mono-data", trendConfig.color)}>
                {comparison.change > 0 ? "+" : ""}
                {comparison.change.toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              vs. {comparison.previous}
            </span>
          </div>
        ) : (
          <div className="pt-3 border-t border-border/50">
            {change !== undefined && (
              <div className="flex items-center gap-2 mb-2">
                <TrendIcon className={cn("h-3.5 w-3.5", trendConfig.color)} strokeWidth={2.5} />
                <span className={cn("text-sm font-bold font-mono-data", trendConfig.color)}>
                  {change > 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
