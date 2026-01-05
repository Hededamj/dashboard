"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TrendData } from "@/types";
import { Users } from "lucide-react";

interface MemberGrowthChartProps {
  data: TrendData[];
}

export function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  return (
    <div className="relative overflow-hidden bg-card border-2 border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 group">
      {/* Header */}
      <div className="border-b-2 border-border p-6 bg-background/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Member Analysis
            </h3>
            <h2 className="text-xl font-bold text-foreground">Medlem Vækst</h2>
          </div>
          <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Users className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
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
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                fontFamily: "'Outfit', sans-serif",
                fontWeight: "600",
              }}
              iconType="rect"
            />
            <Line
              type="monotone"
              dataKey="members"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              activeDot={{ r: 7, strokeWidth: 2 }}
              name="Nuværende periode"
            />
            <Line
              type="monotone"
              dataKey="previousMembers"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--muted-foreground))", r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              name="Forrige periode"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
