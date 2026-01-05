"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { AlertTriangle, TrendingDown, Users, Mail, Calendar, Target } from "lucide-react";

interface MemberInsights {
  churnAnalysis: {
    totalCanceled: number;
    avgLifetimeDays: number;
    avgLifetimeMonths: number;
    churnByLifetime: Record<string, number>;
    churnByCohort: Record<string, { total: number; canceled: number; churnRate: number }>;
    riskIndicators: {
      scheduledCancellations: number;
      pastDue: number;
      totalAtRisk: number;
    };
  };
  memberProfiles: {
    totalUniqueCustomers: number;
    emailAnalysis: {
      privateEmails: number;
      businessEmails: number;
      privatePercentage: string;
      topDomains: Record<string, number>;
    };
    signupTrends: Record<string, number>;
    signupTiming: {
      byDayOfWeek: Record<string, number>;
      byHourOfDay: Record<string, number>;
    };
    trialAnalysis: {
      currentActiveTrials: number;
      totalTrialsEver: number;
      convertedTrials: number;
      conversionRate: string;
    };
  };
  generatedAt: string;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function MemberInsightsPage() {
  const [insights, setInsights] = useState<MemberInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/member-insights");

        if (!res.ok) {
          throw new Error("Failed to fetch member insights");
        }

        const data = await res.json();
        setInsights(data);
      } catch (err) {
        console.error("Error fetching insights:", err);
        setError("Kunne ikke hente member insights. Prøv igen senere.");
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
            <h2 className="text-xl font-semibold text-foreground mb-2">Henter insights fra Stripe...</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Dette kan tage 15-30 sekunder første gang.<br />
              Næste gang er det instant! ⚡
            </p>
          </div>
          <div className="animate-pulse mt-8">
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-card border-2 border-border" />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-96 bg-card border-2 border-border" />
              <div className="h-96 bg-card border-2 border-border" />
            </div>
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
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-destructive">Fejl</h3>
            <p className="text-destructive">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  // Prepare chart data
  const churnLifetimeData = Object.entries(insights.churnAnalysis.churnByLifetime).map(
    ([period, count]) => ({
      period,
      count,
    })
  );

  const churnCohortData = Object.entries(insights.churnAnalysis.churnByCohort)
    .map(([month, data]) => ({
      month,
      churnRate: parseFloat(data.churnRate.toFixed(1)),
      total: data.total,
      canceled: data.canceled,
    }))
    .reverse(); // Oldest to newest

  const emailData = [
    { name: "Private", value: insights.memberProfiles.emailAnalysis.privateEmails },
    { name: "Business", value: insights.memberProfiles.emailAnalysis.businessEmails },
  ];

  const topDomainsData = Object.entries(insights.memberProfiles.emailAnalysis.topDomains)
    .map(([domain, count]) => ({
      domain,
      count,
    }))
    .slice(0, 8);

  const signupTrendsData = Object.entries(insights.memberProfiles.signupTrends)
    .map(([month, count]) => ({
      month,
      signups: count,
    }))
    .reverse();

  // Prepare signup timing data for charts
  const dayOrder = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
  const signupByDayData = dayOrder.map((day) => ({
    day,
    signups: insights.memberProfiles.signupTiming.byDayOfWeek[day] || 0,
  }));

  const signupByHourData = Object.entries(insights.memberProfiles.signupTiming.byHourOfDay)
    .map(([hour, count]) => ({
      hour,
      signups: count,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">Medlem Insights</h2>
          <p className="text-muted-foreground">Churn analyse og medlems profiler</p>
        </div>

        {/* Risk Indicators */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Churned</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {insights.churnAnalysis.totalCanceled}
              </div>
              <p className="text-xs text-muted-foreground">
                Gns. levetid: {insights.churnAnalysis.avgLifetimeMonths} måneder
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {insights.churnAnalysis.riskIndicators.totalAtRisk}
              </div>
              <p className="text-xs text-muted-foreground">
                {insights.churnAnalysis.riskIndicators.scheduledCancellations} scheduled,{" "}
                {insights.churnAnalysis.riskIndicators.pastDue} past due
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Conversion</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {insights.memberProfiles.trialAnalysis.conversionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {insights.memberProfiles.trialAnalysis.convertedTrials} /{" "}
                {insights.memberProfiles.trialAnalysis.totalTrialsEver} trials
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Churn Analysis */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">🔴 Churn Analyse</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Churn by Lifetime */}
            <Card>
              <CardHeader>
                <CardTitle>Hvornår dropper medlemmer ud?</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={churnLifetimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Churn by Cohort */}
            <Card>
              <CardHeader>
                <CardTitle>Churn Rate per Cohort</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={churnCohortData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="churnRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Churn Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Member Profiles */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">👥 Medlem Profiler</h3>

          <div className="grid gap-4 md:grid-cols-2 mb-4">
            {/* Email Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Private vs. Business Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emailData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {emailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {insights.memberProfiles.emailAnalysis.privatePercentage}% private emails
                </p>
              </CardContent>
            </Card>

            {/* Top Email Domains */}
            <Card>
              <CardHeader>
                <CardTitle>Top Email Domæner</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topDomainsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="domain" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Signup Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Signup Trends (Sidste 12 måneder)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={signupTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Nye Signups"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Signup Timing Analysis */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">⏰ Hvornår tilmelder kunderne sig?</h3>
          <p className="text-muted-foreground mb-4">
            Brug denne data til at optimere timing af jeres annoncer
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Signup by Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle>Tilmeldinger per ugedag</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={signupByDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="signups" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Hvilke dage konverterer bedst?
                </p>
              </CardContent>
            </Card>

            {/* Signup by Hour of Day */}
            <Card>
              <CardHeader>
                <CardTitle>Tilmeldinger per time på dagen</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={signupByHourData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={1}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Tilmeldinger"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-sm text-muted-foreground text-center mt-2">
                  Hvornår på dagen er folk mest aktive?
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Genereret: {new Date(insights.generatedAt).toLocaleString("da-DK")}
        </div>
      </main>
    </div>
  );
}
