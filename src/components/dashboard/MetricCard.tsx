import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  }[trend];

  const TrendIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[comparison?.trend || trend];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {/* Period comparison */}
        {comparison && (
          <div className="mt-2 flex items-center gap-2">
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
            <span className={cn("text-sm font-semibold", trendColor)}>
              {comparison.change > 0 ? "+" : ""}
              {comparison.change.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">
              vs. forrige periode ({comparison.previous})
            </span>
          </div>
        )}

        {/* Legacy change/description display */}
        {!comparison && (change !== undefined || description) && (
          <div className="flex items-center gap-2 mt-2">
            {change !== undefined && (
              <p className={cn("text-xs font-medium", trendColor)}>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
