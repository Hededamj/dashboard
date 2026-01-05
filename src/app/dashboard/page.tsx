"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MemberGrowthChart } from "@/components/dashboard/MemberGrowthChart";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { RecentActivityTable } from "@/components/dashboard/RecentActivityTable";
import { PeriodSelector, type PeriodType } from "@/components/dashboard/PeriodSelector";
import { ExportButton } from "@/components/export/ExportButton";
import type { DashboardMetrics, TrendData, ActivityEvent, AnalyticsMetrics } from "@/types";
import { Users, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
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

        const [metricsRes, trendsRes, activityRes, analyticsRes] = await Promise.all([
          fetch(`/api/metrics?period=${selectedPeriod}`),
          fetch(`/api/trends?period=${selectedPeriod}`),
          fetch("/api/activity"),
          fetch("/api/analytics"),
        ]);

        if (!metricsRes.ok || !trendsRes.ok || !activityRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [metricsData, trendsData, activityData, analyticsData] = await Promise.all([
          metricsRes.json(),
          trendsRes.json(),
          activityRes.json(),
          analyticsRes.ok ? analyticsRes.json() : null,
        ]);

        setMetrics(metricsData);
        setTrends(trendsData);
        setActivity(activityData);
        setAnalytics(analyticsData);
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
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-6 py-12">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-40 bg-card border-2 border-border animate-pulse"
              />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="h-96 bg-card border-2 border-border animate-pulse" />
            <div className="h-96 bg-card border-2 border-border animate-pulse" />
          </div>
          <div className="h-96 bg-card border-2 border-border animate-pulse" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-6 py-12">
          <div className="bg-destructive/10 border-2 border-destructive/50 p-6">
            <h3 className="font-bold text-lg mb-2 text-destructive">Fejl</h3>
            <p className="text-foreground/80 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-colors"
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
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-12">
        {/* Period Selector & Export - Animated header */}
        <div className="flex items-center justify-between gap-4 mb-10 animate-slide-in-right">
          <div className="flex-1">
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </div>
          {metrics && (
            <ExportButton
              dashboardMetrics={metrics}
              analyticsMetrics={analytics || undefined}
              period={selectedPeriod}
            />
          )}
        </div>

        {/* Metric Cards - Asymmetric grid with staggered animations */}
        <div className="grid gap-6 mb-12">
          {/* Top row: 3 cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="animate-scale-in delay-100">
              <MetricCard
                title="MRR (4 uger)"
                value={formatCurrency(metrics.mrr)}
                icon={DollarSign}
                description={`${metrics.payingMembers} betalende medlemmer`}
                comparison={metrics.mrrComparison}
              />
            </div>

            <div className="animate-scale-in delay-200">
              <MetricCard
                title="Betalende Medlemmer"
                value={metrics.payingMembers}
                icon={Users}
                description={`${metrics.trialMembers} i trial`}
                trend={metrics.payingMembers > 0 ? "up" : "neutral"}
              />
            </div>

            <div className="animate-scale-in delay-300">
              <MetricCard
                title="Tilmeldinger i dag"
                value={metrics.newSignupsToday}
                icon={TrendingUp}
                description={`${metrics.newSignupsThisWeek} denne uge | ${metrics.newSignupsThisMonth} denne måned`}
                trend={metrics.newSignupsToday > 0 ? "up" : "neutral"}
              />
            </div>
          </div>

          {/* Bottom row: 1 card spanning full width or offset */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-start-2 animate-scale-in delay-400">
              <MetricCard
                title="Churn Rate"
                value={formatPercentage(metrics.churnRate)}
                icon={TrendingDown}
                description={`${metrics.cancellationsThisMonth} opsigelser`}
                trend={metrics.churnRate > 5 ? "down" : "up"}
              />
            </div>
          </div>
        </div>

        {/* Charts - Staggered reveal */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <div className="animate-slide-in-up delay-100">
            <MemberGrowthChart data={trends} />
          </div>
          <div className="animate-slide-in-up delay-200">
            <RevenueTrendChart data={trends} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-in delay-300">
          <RecentActivityTable data={activity} />
        </div>

        {/* Version Footer - Technical style */}
        <div className="mt-12 pt-6 border-t border-border/50">
          <div className="flex items-center justify-between text-xs font-mono-data text-muted-foreground">
            <span>DASHBOARD v2.1</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              BUILD {new Date().toISOString().split('T')[0]} 22:30
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
