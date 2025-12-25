"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MemberGrowthChart } from "@/components/dashboard/MemberGrowthChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import type { DashboardMetrics, TrendData, ActivityEvent } from "@/types";
import { Users, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, trendsRes, activityRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch("/api/trends"),
          fetch("/api/activity"),
        ]);

        if (!metricsRes.ok || !trendsRes.ok || !activityRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [metricsData, trendsData, activityData] = await Promise.all([
          metricsRes.json(),
          trendsRes.json(),
          activityRes.json(),
        ]);

        setMetrics(metricsData);
        setTrends(trendsData);
        setActivity(activityData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Kunne ikke hente dashboard data. Prøv igen senere.");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white border rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <div className="h-96 bg-white border rounded-lg animate-pulse" />
            <div className="h-96 bg-white border rounded-lg animate-pulse" />
          </div>
          <div className="h-96 bg-white border rounded-lg animate-pulse" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            <h3 className="font-semibold mb-2">Fejl</h3>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Prøv igen
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="MRR"
            value={formatCurrency(metrics.mrr)}
            icon={DollarSign}
            description="Månedlig tilbagevendende indtægt"
            trend={metrics.growthRate > 0 ? "up" : metrics.growthRate < 0 ? "down" : "neutral"}
            change={metrics.growthRate}
          />

          <MetricCard
            title="Aktive Medlemmer"
            value={metrics.currentMembers}
            icon={Users}
            description={`+${metrics.newSignupsThisMonth} denne måned`}
            trend={metrics.newSignupsThisMonth > metrics.cancellationsThisMonth ? "up" : "down"}
          />

          <MetricCard
            title="Churn Rate"
            value={formatPercentage(metrics.churnRate)}
            icon={TrendingDown}
            description={`${metrics.cancellationsThisMonth} opsigelser`}
            trend={metrics.churnRate > 5 ? "down" : "up"}
          />

          <MetricCard
            title="Total Indtægt"
            value={formatCurrency(metrics.totalRevenue)}
            icon={TrendingUp}
            description="Alle betalinger"
            trend="up"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <MemberGrowthChart data={trends} />
          <RevenueTrendChart data={trends} />
        </div>

        {/* Recent Activity */}
        <RecentActivityTable data={activity} />
      </main>
    </div>
  );
}
