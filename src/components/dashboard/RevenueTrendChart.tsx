"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrendData } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface RevenueTrendChartProps {
  data: TrendData[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <div className="relative overflow-hidden bg-card border-2 border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 group">
      {/* Header */}
      <div className="border-b-2 border-border p-6 bg-background/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Revenue Analysis
            </h3>
            <h2 className="text-xl font-bold text-foreground">Revenue Trend</h2>
          </div>
          <div className="w-10 h-10 rounded bg-secondary/10 border border-secondary/20 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
            <TrendingUp className="h-5 w-5 text-secondary" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="prevRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "'JetBrains Mono', monospace" }}
              stroke="hsl(var(--border))"
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "'JetBrains Mono', monospace" }}
              stroke="hsl(var(--border))"
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "2px solid hsl(var(--border))",
                borderRadius: "0",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
              formatter={(value: number) => [formatCurrency(value), ""]}
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: "600",
              }}
              iconType="rect"
            />
            <Area
              type="monotone"
              dataKey="previousRevenue"
              stroke="hsl(var(--muted-foreground))"
              fill="url(#prevRevenueGradient)"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Forrige periode"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--secondary))"
              fill="url(#revenueGradient)"
              strokeWidth={3}
              name="Nuværende periode"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
