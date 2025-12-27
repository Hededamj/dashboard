"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MemberGrowthChart } from "@/components/dashboard/MemberGrowthChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { PeriodSelector, type PeriodType } from "@/components/dashboard/PeriodSelector";
import type { DashboardMetrics, TrendData, ActivityEvent } from "@/types";
import { Users, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("last4weeks");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking2FA, setChecking2FA] = useState(true);

  // Check 2FA status on mount
  useEffect(() => {
    async function check2FAStatus() {
      try {
        const res = await fetch("/api/2fa/status");
        if (res.ok) {
          const data = await res.json();
          if (data.needsVerification) {
            router.push("/2fa-verify");
            return;
          }
        }
      } catch (err) {
        console.error("Error checking 2FA status:", err);
      } finally {
        setChecking2FA(false);
      }
    }

    check2FAStatus();
  }, [router]);

  useEffect(() => {
    if (checking2FA) return; // Wait for 2FA check first

    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, trendsRes, activityRes] = await Promise.all([
          fetch(`/api/metrics?period=${selectedPeriod}`),
          fetch(`/api/trends?period=${selectedPeriod}`),
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
  }, [selectedPeriod, checking2FA]);

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
        {/* Period Selector */}
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="MRR (4 uger)"
            value={formatCurrency(metrics.mrr)}
            icon={DollarSign}
            description={`${metrics.payingMembers} betalende medlemmer`}
            comparison={metrics.mrrComparison}
          />

          <MetricCard
            title="Betalende Medlemmer"
            value={metrics.payingMembers}
            icon={Users}
            description={`${metrics.trialMembers} i trial`}
            trend={metrics.payingMembers > 0 ? "up" : "neutral"}
          />

          <MetricCard
            title="Nye Medlemmer (4 uger)"
            value={metrics.newSignupsComparison?.current || 0}
            icon={TrendingUp}
            description={`${metrics.newSignupsThisMonth} denne måned`}
            comparison={metrics.newSignupsComparison}
          />

          <MetricCard
            title="Churn Rate"
            value={formatPercentage(metrics.churnRate)}
            icon={TrendingDown}
            description={`${metrics.cancellationsThisMonth} opsigelser`}
            trend={metrics.churnRate > 5 ? "down" : "up"}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <MemberGrowthChart data={trends} />
          <RevenueTrendChart data={trends} />
        </div>

        {/* Recent Activity */}
        <RecentActivityTable data={activity} />

        {/* Version Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Dashboard v2.1 - Build {new Date().toISOString().split('T')[0]} 22:30
        </div>
      </main>
    </div>
  );
}
