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

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/analytics");

        if (!res.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const data = await res.json();
        setAnalytics(data);
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
      <div className="min-h-screen bg-[#FFF6F6]">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white border rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[#FFF6F6]">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-red-800">Fejl</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // Determine health status based on metrics
  const ltvCacHealth = analytics.ltvCacRatio >= 3 ? "up" : analytics.ltvCacRatio >= 2 ? "neutral" : "down";
  const paybackHealth = analytics.paybackPeriod <= 12 ? "up" : analytics.paybackPeriod <= 18 ? "neutral" : "down";

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Unit Economics</h1>
          <p className="text-gray-600">
            Forretnings sundhed og nøgle metrics for optimering
          </p>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            💡 <strong>Marketing spend</strong> er sat til 15.000 DKK/md (gennemsnit).
            Du kan senere integrere med Google Ads / Facebook Ads API for automatisk tracking.
          </p>
        </div>

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
        <div className="bg-white border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📊 Business Health Indicators</h2>

          <div className="space-y-4">
            {/* LTV:CAC */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">LTV:CAC Ratio</span>
                <span className={`font-bold ${
                  analytics.ltvCacRatio >= 3 ? "text-green-600" :
                  analytics.ltvCacRatio >= 2 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {analytics.ltvCacRatio}x
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    analytics.ltvCacRatio >= 3 ? "bg-green-500" :
                    analytics.ltvCacRatio >= 2 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(analytics.ltvCacRatio / 5 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {analytics.ltvCacRatio >= 3
                  ? "✅ Sund ratio - god unit economics"
                  : analytics.ltvCacRatio >= 2
                  ? "⚠️ Acceptabel - kan forbedres"
                  : "❌ For lav - optimér CAC eller reducér churn"}
              </p>
            </div>

            {/* Payback Period */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Payback Period</span>
                <span className={`font-bold ${
                  analytics.paybackPeriod <= 12 ? "text-green-600" :
                  analytics.paybackPeriod <= 18 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {analytics.paybackPeriod} måneder
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    analytics.paybackPeriod <= 12 ? "bg-green-500" :
                    analytics.paybackPeriod <= 18 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min((24 - analytics.paybackPeriod) / 24 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {analytics.paybackPeriod <= 12
                  ? "✅ God - hurtig ROI"
                  : analytics.paybackPeriod <= 18
                  ? "⚠️ Acceptabel - kan forbedres"
                  : "❌ For lang - reducér CAC"}
              </p>
            </div>

            {/* Quick Ratio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Quick Ratio (Vækst Health)</span>
                <span className={`font-bold ${
                  analytics.quickRatio >= 4 ? "text-green-600" :
                  analytics.quickRatio >= 2 ? "text-yellow-600" : "text-red-600"
                }`}>
                  {analytics.quickRatio}x
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    analytics.quickRatio >= 4 ? "bg-green-500" :
                    analytics.quickRatio >= 2 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(analytics.quickRatio / 6 * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
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
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-2 text-indigo-900">🚀 Kommer snart</h2>
          <p className="text-indigo-700 mb-4">
            Vi arbejder på at tilføje følgende analytics features:
          </p>
          <ul className="space-y-2 text-indigo-800">
            <li className="flex items-center gap-2">
              <span className="text-indigo-500">•</span>
              CAC trend over tid (se effektivitet af marketing)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-500">•</span>
              Free trial conversion trend
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-500">•</span>
              Revenue breakdown by membership type
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-500">•</span>
              Cohort retention analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-500">•</span>
              Google Ads / Facebook Ads integration (auto CAC tracking)
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
