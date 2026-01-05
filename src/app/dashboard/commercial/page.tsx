"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, CreditCard, Wallet, ArrowUpRight } from "lucide-react";

interface CommercialInsights {
  payouts: {
    availableBalance: number;
    pendingBalance: number;
    currency: string;
    upcomingPayouts: Array<{
      id: string;
      amount: number;
      arrivalDate: string;
      status: string;
      type: string;
    }>;
  };
  revenue: {
    currentMRR: number;
    projectedNextMonth: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    revenueByInterval: Record<string, number>;
    subscriptionsByInterval: Record<string, number>;
    totalActiveSubscriptions: number;
  };
  transactions: {
    ytdRevenue: number;
    avgRevenuePerMonthYTD: number;
    projectedRevenue12Months: number;
    growthRate: number;
    projectedMonths: Record<string, { actual?: number; projected?: number }>;
  };
  generatedAt: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

export default function CommercialInsightsPage() {
  const [insights, setInsights] = useState<CommercialInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/commercial-insights");

        if (!res.ok) {
          throw new Error("Failed to fetch commercial insights");
        }

        const data = await res.json();
        setInsights(data);
      } catch (err) {
        console.error("Error fetching commercial insights:", err);
        setError("Kunne ikke hente kommercielle insights. Prøv igen senere.");
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Henter kommercielle data...</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Henter udbetalinger, balance og revenue data fra Stripe
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <p className="text-red-600">{error || "Ingen data tilgængelig"}</p>
          </div>
        </main>
      </div>
    );
  }

  // Prepare chart data
  const revenueByIntervalData = Object.entries(insights.revenue.revenueByInterval).map(
    ([interval, amount]) => ({
      name: interval === "month" ? "Månedlig" : "Årlig",
      revenue: Math.round(amount),
    })
  );

  const subscriptionsByIntervalData = Object.entries(insights.revenue.subscriptionsByInterval).map(
    ([interval, count]) => ({
      name: interval === "month" ? "Månedlig" : "Årlig",
      count: count,
    })
  );

  const trendData = Object.entries(insights.transactions.projectedMonths)
    .map(([month, data]) => ({
      month,
      actual: data.actual ? Math.round(data.actual) : null,
      projected: data.projected ? Math.round(data.projected) : null,
    }));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Kommercielle Insights
          </h2>
          <p className="text-muted-foreground">Udbetalinger, revenue og cash flow oversigt</p>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tilgængelig Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {insights.payouts.availableBalance.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-muted-foreground mt-1">Klar til udbetaling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {insights.payouts.pendingBalance.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-muted-foreground mt-1">Kommer snart</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR (Nuværende)</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {insights.revenue.currentMRR.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-muted-foreground mt-1">Månedlig recurring revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Forventet Næste Måned</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {insights.revenue.projectedNextMonth.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-muted-foreground mt-1">Baseret på nuværende MRR</p>
            </CardContent>
          </Card>
        </div>

        {/* Payouts Row */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Next Payout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Næste Udbetaling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Pending Balance</p>
                <p className="text-3xl font-bold text-green-600">
                  {insights.payouts.pendingBalance.toLocaleString("da-DK")} kr.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Kommer inden for 1-7 dage
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payouts */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Seneste Udbetalinger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.payouts.upcomingPayouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Ingen udbetalinger endnu</p>
              ) : (
                <div className="space-y-3">
                  {insights.payouts.upcomingPayouts.slice(0, 3).map((payout) => (
                    <div key={payout.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {new Date(payout.arrivalDate).toLocaleDateString("da-DK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{payout.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">
                          {payout.amount.toLocaleString("da-DK")} kr.
                        </p>
                        <p className="text-xs text-muted-foreground">{payout.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend Chart - Full Width */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Revenue Trend & Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: number) => value ? `${value.toLocaleString("da-DK")} kr.` : 'N/A'} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Faktisk"
                  dot={{ fill: '#10b981', r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Prognose"
                  dot={{ fill: '#8b5cf6', r: 3 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Grøn = Faktisk historik | Lilla stiplet = Fremskrivning baseret på trend
            </p>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Forecast & YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border-r pr-4">
                <p className="text-sm text-muted-foreground mb-1">Gns. Revenue/Måned (YTD)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {insights.transactions.avgRevenuePerMonthYTD.toLocaleString("da-DK")} kr.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total YTD: {insights.transactions.ytdRevenue.toLocaleString("da-DK")} kr.
                </p>
              </div>
              <div className="border-r pr-4">
                <p className="text-sm text-muted-foreground mb-1">Projected 12 Måneder</p>
                <p className="text-2xl font-bold text-purple-600">
                  {insights.transactions.projectedRevenue12Months.toLocaleString("da-DK")} kr.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Baseret på nuværende trend
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vækst Rate</p>
                <p className={`text-2xl font-bold ${insights.transactions.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {insights.transactions.growthRate > 0 ? '+' : ''}{insights.transactions.growthRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  YTD growth trend
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
