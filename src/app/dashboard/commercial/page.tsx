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
    recentCharges: Array<{
      id: string;
      amount: number;
      currency: string;
      created: string;
      status: string;
    }>;
    revenueByMonth: Record<string, number>;
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
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Henter kommercielle data...</h2>
            <p className="text-gray-600 text-center max-w-md">
              Henter udbetalinger, balance og revenue data fra Stripe
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  const revenueByMonthData = Object.entries(insights.transactions.revenueByMonth)
    .map(([month, amount]) => ({
      month,
      revenue: Math.round(amount),
    }))
    .reverse()
    .slice(0, 6)
    .reverse();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Kommercielle Insights
          </h2>
          <p className="text-gray-600">Udbetalinger, revenue og cash flow oversigt</p>
        </div>

        {/* Top Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tilgængelig Balance</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {insights.payouts.availableBalance.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-gray-500 mt-1">Klar til udbetaling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Balance</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {insights.payouts.pendingBalance.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-gray-500 mt-1">Kommer snart</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">MRR (Nuværende)</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {insights.revenue.currentMRR.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-gray-500 mt-1">Månedlig recurring revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Forventet Næste Måned</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {insights.revenue.projectedNextMonth.toLocaleString("da-DK")} kr.
              </div>
              <p className="text-xs text-gray-500 mt-1">Baseret på nuværende MRR</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Upcoming Payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Kommende Udbetalinger
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.payouts.upcomingPayouts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Ingen planlagte udbetalinger</p>
              ) : (
                <div className="space-y-3">
                  {insights.payouts.upcomingPayouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(payout.arrivalDate).toLocaleDateString("da-DK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{payout.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {payout.amount.toLocaleString("da-DK")} kr.
                        </p>
                        <p className="text-xs text-gray-500">{payout.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Fordeling</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueByIntervalData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, revenue }) =>
                      `${name}: ${revenue.toLocaleString("da-DK")} kr.`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {revenueByIntervalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("da-DK")} kr.`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Sidste 6 Måneder)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByMonthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("da-DK")} kr.`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subscriptions by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions efter Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subscriptionsByIntervalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="Antal" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border-r pr-4">
                <p className="text-sm text-gray-600 mb-1">Månedlig Revenue</p>
                <p className="text-2xl font-bold text-blue-600">
                  {insights.revenue.monthlyRevenue.toLocaleString("da-DK")} kr.
                </p>
              </div>
              <div className="border-r pr-4">
                <p className="text-sm text-gray-600 mb-1">Årlig Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  {insights.revenue.yearlyRevenue.toLocaleString("da-DK")} kr.
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Aktive Subscriptions</p>
                <p className="text-2xl font-bold text-green-600">
                  {insights.revenue.totalActiveSubscriptions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
