"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  Users,
  BarChart3
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { AnalyticsMetrics } from "@/types";

interface MetaSpendData {
  totalSpend: number;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  currency: string;
  fallback?: boolean;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [metaSpend, setMetaSpend] = useState<MetaSpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const [analyticsRes, metaSpendRes] = await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/meta-spend"),
        ]);

        if (!analyticsRes.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const analyticsData = await analyticsRes.json();
        const metaSpendData = metaSpendRes.ok ? await metaSpendRes.json() : null;

        setAnalytics(analyticsData);
        setMetaSpend(metaSpendData);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Kunne ikke hente analytics data. Prøv igen senere.");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-card border-2 border-border w-48 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-card border-2 border-border" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-6 py-12">
          <div className="bg-destructive/10 border-2 border-destructive/50 p-6">
            <h3 className="font-bold text-lg mb-2 text-destructive">Fejl</h3>
            <p className="text-foreground/80">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // Determine health status based on metrics
  const ltvCacHealth = analytics.ltvCacRatio >= 3 ? "up" : analytics.ltvCacRatio >= 2 ? "neutral" : "down";
  const paybackHealth = analytics.paybackPeriod <= 12 ? "up" : analytics.paybackPeriod <= 18 ? "neutral" : "down";

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 animate-slide-in-right">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Unit Economics</h1>
          <p className="text-muted-foreground">
            Forretnings sundhed og nøgle metrics for optimering
          </p>
        </div>

        {/* Meta Spend Info */}
        {metaSpend && (
          <div className={`border-2 p-6 mb-8 animate-fade-in ${
            metaSpend.fallback
              ? "bg-accent/10 border-accent/50"
              : "bg-secondary/10 border-secondary/50"
          }`}>
            <p className={`text-sm font-semibold ${metaSpend.fallback ? "text-accent" : "text-secondary"}`}>
              {metaSpend.fallback ? (
                <>
                  ⚠️ <strong>Meta Marketing API</strong> ikke tilgængelig. Bruger fallback værdi: {formatCurrency(metaSpend.monthlySpend)}/md
                </>
              ) : (
                <>
                  ✅ <strong>Live Meta Ad Spend:</strong> {formatCurrency(metaSpend.dailySpend)}/dag
                  {" | "}
                  {formatCurrency(metaSpend.weeklySpend)}/uge
                  {" | "}
                  <strong>{formatCurrency(metaSpend.monthlySpend)}/måned</strong>
                </>
              )}
            </p>
          </div>
        )}

        {/* Unit Economics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="LTV (Lifetime Value)"
            value={formatCurrency(analytics.ltv)}
            icon={TrendingUp}
            description="Gennemsnitlig værdi per kunde"
            trend="up"
          />

          <MetricCard
            title="CAC (Acquisition Cost)"
            value={formatCurrency(analytics.cac)}
            icon={DollarSign}
            description="Cost per ny kunde"
            trend="neutral"
          />

          <MetricCard
            title="LTV:CAC Ratio"
            value={`${analytics.ltvCacRatio}x`}
            icon={Target}
            description={analytics.ltvCacRatio >= 3 ? "Sund ratio (>3x)" : "Under target (<3x)"}
            trend={ltvCacHealth}
          />

          <MetricCard
            title="Payback Period"
            value={`${analytics.paybackPeriod} mdr`}
            icon={Calendar}
            description="Tid til breakeven"
            trend={paybackHealth}
          />
        </div>

        {/* Conversion & Growth Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <MetricCard
            title="Free Trial Conversion"
            value={formatPercentage(analytics.freeTrialConversionRate)}
            icon={Users}
            description="% der konverterer til betalt"
            trend="neutral"
          />

          <MetricCard
            title="Net MRR Growth"
            value={formatCurrency(analytics.netMrrGrowth)}
            icon={BarChart3}
            description="Månedlig MRR ændring"
            trend={analytics.netMrrGrowth >= 0 ? "up" : "down"}
          />

          <MetricCard
            title="Quick Ratio"
            value={`${analytics.quickRatio}x`}
            icon={TrendingUp}
            description={analytics.quickRatio >= 4 ? "Sund vækst (>4x)" : "Under target (<4x)"}
            trend={analytics.quickRatio >= 4 ? "up" : "neutral"}
          />
        </div>

        {/* Health Indicators */}
        <div className="bg-card border-2 border-border p-8 mb-8 hover:border-primary/50 transition-all duration-500 animate-slide-in-up delay-200">
          <h2 className="text-xl font-bold mb-6 text-foreground">📊 Business Health Indicators</h2>

          <div className="space-y-6">
            {/* LTV:CAC */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">LTV:CAC Ratio</span>
                <span className={`font-bold font-mono-data ${
                  analytics.ltvCacRatio >= 3 ? "text-secondary" :
                  analytics.ltvCacRatio >= 2 ? "text-accent" : "text-destructive"
                }`}>
                  {analytics.ltvCacRatio}x
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-border">
                <div
                  className={`h-full ${
                    analytics.ltvCacRatio >= 3 ? "bg-secondary" :
                    analytics.ltvCacRatio >= 2 ? "bg-accent" : "bg-destructive"
                  }`}
                  style={{ width: `${Math.min(analytics.ltvCacRatio / 5 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics.ltvCacRatio >= 3
                  ? "✅ Sund ratio - god unit economics"
                  : analytics.ltvCacRatio >= 2
                  ? "⚠️ Acceptabel - kan forbedres"
                  : "❌ For lav - optimér CAC eller reducér churn"}
              </p>
            </div>

            {/* Payback Period */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">Payback Period</span>
                <span className={`font-bold font-mono-data ${
                  analytics.paybackPeriod <= 12 ? "text-secondary" :
                  analytics.paybackPeriod <= 18 ? "text-accent" : "text-destructive"
                }`}>
                  {analytics.paybackPeriod} måneder
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-border">
                <div
                  className={`h-full ${
                    analytics.paybackPeriod <= 12 ? "bg-secondary" :
                    analytics.paybackPeriod <= 18 ? "bg-accent" : "bg-destructive"
                  }`}
                  style={{ width: `${Math.min((24 - analytics.paybackPeriod) / 24 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics.paybackPeriod <= 12
                  ? "✅ God - hurtig ROI"
                  : analytics.paybackPeriod <= 18
                  ? "⚠️ Acceptabel - kan forbedres"
                  : "❌ For lang - reducér CAC"}
              </p>
            </div>

            {/* Quick Ratio */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground">Quick Ratio (Vækst Health)</span>
                <span className={`font-bold font-mono-data ${
                  analytics.quickRatio >= 4 ? "text-secondary" :
                  analytics.quickRatio >= 2 ? "text-accent" : "text-destructive"
                }`}>
                  {analytics.quickRatio}x
                </span>
              </div>
              <div className="w-full bg-muted/30 h-3 border border-border">
                <div
                  className={`h-full ${
                    analytics.quickRatio >= 4 ? "bg-secondary" :
                    analytics.quickRatio >= 2 ? "bg-accent" : "bg-destructive"
                  }`}
                  style={{ width: `${Math.min(analytics.quickRatio / 6 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {analytics.quickRatio >= 4
                  ? "✅ Sund vækst - ny MRR overstiger churn"
                  : analytics.quickRatio >= 2
                  ? "⚠️ Moderat vækst"
                  : "❌ Langsom vækst - fokusér på retention"}
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-primary/10 border-2 border-primary/50 p-8 animate-fade-in delay-300">
          <h2 className="text-xl font-bold mb-3 text-primary">🚀 Kommer snart</h2>
          <p className="text-foreground mb-6 font-medium">
            Vi arbejder på at tilføje følgende analytics features:
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="text-primary font-bold">•</span>
              <span>CAC trend over tid (se effektivitet af marketing)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-bold">•</span>
              <span>Free trial conversion trend</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-bold">•</span>
              <span>Revenue breakdown by membership type</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-bold">•</span>
              <span>Cohort retention analysis</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="text-primary font-bold">•</span>
              <span>Google Ads integration (auto CAC tracking)</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
