"use client";

import { useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  Upload,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Target,
  Eye,
  MousePointer,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface AdData {
  date: string;
  adName: string;
  platform: string;
  placement: string;
  spend: number;
  reach: number;
  impressions: number;
  results: number;
  costPerResult: number | null;
}

interface AdStats {
  name: string;
  spend: number;
  reach: number;
  impressions: number;
  results: number;
  cpa: number | null;
  cpm: number;
}

interface WeeklyData {
  week: string;
  spend: number;
  results: number;
  cpa: number | null;
  cpm: number;
  impressions: number;
}

interface Alert {
  type: "danger" | "warning" | "info";
  title: string;
  message: string;
  metric?: string;
  change?: number;
}

export default function AdsAnalysePage() {
  const [data, setData] = useState<AdData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<"best" | "previous">("best");

  const parseExcelFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet);

      const parsedData: AdData[] = rawData.map((row: Record<string, unknown>) => ({
        date: String(row["Reporting starts"] || ""),
        adName: String(row["Ad name"] || ""),
        platform: String(row["Platform"] || ""),
        placement: String(row["Placement"] || ""),
        spend: Number(row["Amount spent (DKK)"]) || 0,
        reach: Number(row["Reach"]) || 0,
        impressions: Number(row["Impressions"]) || 0,
        results: row["Results"] && row["Results"] !== "-" ? Number(row["Results"]) : 0,
        costPerResult: row["Cost per results"] && row["Cost per results"] !== "-"
          ? Number(row["Cost per results"])
          : null,
      }));

      setData(parsedData);
    } catch (err) {
      console.error("Error parsing file:", err);
      setError("Kunne ikke læse filen. Sørg for at det er en gyldig Excel-fil fra Facebook Ads.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".xlsx")) {
      parseExcelFile(file);
    } else {
      setError("Kun .xlsx filer understøttes");
    }
  }, [parseExcelFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  // Calculate aggregated stats
  const totalStats = data.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      reach: acc.reach + row.reach,
      impressions: acc.impressions + row.impressions,
      results: acc.results + row.results,
    }),
    { spend: 0, reach: 0, impressions: 0, results: 0 }
  );

  const overallCPA = totalStats.results > 0 ? totalStats.spend / totalStats.results : null;
  const overallCPM = totalStats.impressions > 0 ? (totalStats.spend / totalStats.impressions) * 1000 : 0;

  // Stats per ad
  const adStats: AdStats[] = Object.values(
    data.reduce((acc: Record<string, AdStats>, row) => {
      if (!acc[row.adName]) {
        acc[row.adName] = {
          name: row.adName,
          spend: 0,
          reach: 0,
          impressions: 0,
          results: 0,
          cpa: null,
          cpm: 0,
        };
      }
      acc[row.adName].spend += row.spend;
      acc[row.adName].reach += row.reach;
      acc[row.adName].impressions += row.impressions;
      acc[row.adName].results += row.results;
      return acc;
    }, {})
  ).map((ad) => ({
    ...ad,
    cpa: ad.results > 0 ? ad.spend / ad.results : null,
    cpm: ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0,
  }));

  // Stats per platform
  const platformStats: AdStats[] = Object.values(
    data.reduce((acc: Record<string, AdStats>, row) => {
      if (!acc[row.platform]) {
        acc[row.platform] = {
          name: row.platform,
          spend: 0,
          reach: 0,
          impressions: 0,
          results: 0,
          cpa: null,
          cpm: 0,
        };
      }
      acc[row.platform].spend += row.spend;
      acc[row.platform].reach += row.reach;
      acc[row.platform].impressions += row.impressions;
      acc[row.platform].results += row.results;
      return acc;
    }, {})
  ).map((p) => ({
    ...p,
    cpa: p.results > 0 ? p.spend / p.results : null,
    cpm: p.impressions > 0 ? (p.spend / p.impressions) * 1000 : 0,
  }));

  // Weekly trend data
  const weeklyData: WeeklyData[] = Object.values(
    data.reduce((acc: Record<string, WeeklyData>, row) => {
      const date = new Date(row.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!acc[weekKey]) {
        acc[weekKey] = {
          week: weekKey,
          spend: 0,
          results: 0,
          cpa: null,
          cpm: 0,
          impressions: 0,
        };
      }
      acc[weekKey].spend += row.spend;
      acc[weekKey].results += row.results;
      acc[weekKey].impressions += row.impressions;
      return acc;
    }, {})
  )
    .map((w) => ({
      ...w,
      cpa: w.results > 0 ? w.spend / w.results : null,
      cpm: w.impressions > 0 ? (w.spend / w.impressions) * 1000 : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Find best week and current week
  const bestWeek = weeklyData.reduce(
    (best, week) => {
      if (week.cpa !== null && (best.cpa === null || week.cpa < best.cpa)) {
        return week;
      }
      return best;
    },
    { week: "", spend: 0, results: 0, cpa: null as number | null, cpm: 0, impressions: 0 }
  );

  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeek = weeklyData[weeklyData.length - 2];

  // Generate alerts
  const alerts: Alert[] = [];

  // CPA alerts
  if (currentWeek && bestWeek.cpa && currentWeek.cpa) {
    const cpaChange = ((currentWeek.cpa - bestWeek.cpa) / bestWeek.cpa) * 100;
    if (cpaChange > 100) {
      alerts.push({
        type: "danger",
        title: "CPA er mere end fordoblet",
        message: `CPA er steget fra ${bestWeek.cpa.toFixed(0)} DKK (uge ${bestWeek.week.slice(5)}) til ${currentWeek.cpa.toFixed(0)} DKK`,
        metric: "CPA",
        change: cpaChange,
      });
    } else if (cpaChange > 50) {
      alerts.push({
        type: "warning",
        title: "CPA stiger markant",
        message: `CPA er steget ${cpaChange.toFixed(0)}% fra bedste uge`,
        metric: "CPA",
        change: cpaChange,
      });
    }
  }

  // CPM alerts (ad fatigue indicator)
  if (currentWeek && previousWeek) {
    const cpmChange = ((currentWeek.cpm - previousWeek.cpm) / previousWeek.cpm) * 100;
    if (cpmChange > 30) {
      alerts.push({
        type: "warning",
        title: "CPM stiger - mulig ad fatigue",
        message: `CPM er steget ${cpmChange.toFixed(0)}% fra sidste uge. Overvej at opdatere creatives.`,
        metric: "CPM",
        change: cpmChange,
      });
    }
  }

  // Conversion drop alerts
  if (currentWeek && previousWeek && previousWeek.results > 0) {
    const conversionChange = ((currentWeek.results - previousWeek.results) / previousWeek.results) * 100;
    if (conversionChange < -50) {
      alerts.push({
        type: "danger",
        title: "Konverteringer faldet drastisk",
        message: `Antal køb er faldet ${Math.abs(conversionChange).toFixed(0)}% fra sidste uge`,
        metric: "Konverteringer",
        change: conversionChange,
      });
    } else if (conversionChange < -25) {
      alerts.push({
        type: "warning",
        title: "Konverteringer falder",
        message: `Antal køb er faldet ${Math.abs(conversionChange).toFixed(0)}% fra sidste uge`,
        metric: "Konverteringer",
        change: conversionChange,
      });
    }
  }

  // Underperforming ads
  adStats.forEach((ad) => {
    if (ad.spend > 300 && ad.results === 0) {
      alerts.push({
        type: "danger",
        title: `Stop: ${ad.name}`,
        message: `Brugt ${ad.spend.toFixed(0)} DKK uden konverteringer`,
        metric: "Wasted spend",
      });
    }
  });

  // Comparison data
  const comparisonBaseline = comparisonMode === "best" ? bestWeek : previousWeek;

  const formatWeekLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <main className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 animate-slide-in-right">
          <h1 className="text-3xl font-bold text-foreground mb-2">Ads Analyse</h1>
          <p className="text-muted-foreground">
            Upload Facebook Ads data og få indsigt i kampagne-performance
          </p>
        </div>

        {/* Upload Area */}
        {data.length === 0 && (
          <div
            className={`border-2 border-dashed p-12 text-center transition-all duration-300 ${
              dragActive
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">
              Træk din Facebook Ads Excel-fil hertil
            </h3>
            <p className="text-muted-foreground mb-4">
              Eller klik for at vælge en fil
            </p>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground font-bold cursor-pointer hover:bg-primary/90 transition-colors"
            >
              Vælg fil
            </label>
            <p className="text-sm text-muted-foreground mt-4">
              Understøtter .xlsx filer eksporteret fra Facebook Ads Manager
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Analyserer data...</p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border-2 border-destructive/50 p-6 mb-8">
            <h3 className="font-bold text-lg mb-2 text-destructive">Fejl</h3>
            <p className="text-foreground/80">{error}</p>
          </div>
        )}

        {/* Analysis Results */}
        {data.length > 0 && !loading && (
          <>
            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="mb-8 space-y-3 animate-fade-in">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  Advarsler & Anbefalinger
                </h2>
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`border-2 p-4 flex items-start gap-4 ${
                      alert.type === "danger"
                        ? "bg-destructive/10 border-destructive/50"
                        : alert.type === "warning"
                        ? "bg-accent/10 border-accent/50"
                        : "bg-primary/10 border-primary/50"
                    }`}
                  >
                    {alert.type === "danger" ? (
                      <TrendingDown className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-foreground">{alert.title}</h4>
                      <p className="text-muted-foreground text-sm">{alert.message}</p>
                    </div>
                    {alert.change !== undefined && (
                      <span
                        className={`ml-auto font-mono-data font-bold ${
                          alert.change > 0 ? "text-destructive" : "text-secondary"
                        }`}
                      >
                        {alert.change > 0 ? "+" : ""}
                        {alert.change.toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <MetricCard
                title="Total Spend"
                value={formatCurrency(totalStats.spend)}
                icon={DollarSign}
                description={`${data.length} rækker data`}
                trend="neutral"
              />
              <MetricCard
                title="Total Køb"
                value={totalStats.results.toString()}
                icon={Target}
                description="Konverteringer"
                trend={totalStats.results > 0 ? "up" : "down"}
              />
              <MetricCard
                title="Gennemsnitlig CPA"
                value={overallCPA ? `${overallCPA.toFixed(0)} DKK` : "N/A"}
                icon={MousePointer}
                description="Cost per acquisition"
                trend={overallCPA && overallCPA < 100 ? "up" : "down"}
              />
              <MetricCard
                title="CPM"
                value={`${overallCPM.toFixed(0)} DKK`}
                icon={Eye}
                description="Cost per 1000 visninger"
                trend="neutral"
              />
            </div>

            {/* Comparison Mode Toggle */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-semibold text-muted-foreground">Sammenlign med:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setComparisonMode("best")}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    comparisonMode === "best"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Bedste uge
                </button>
                <button
                  onClick={() => setComparisonMode("previous")}
                  className={`px-4 py-2 text-sm font-bold transition-all ${
                    comparisonMode === "previous"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Forrige periode
                </button>
              </div>
            </div>

            {/* Comparison Cards */}
            {comparisonBaseline && currentWeek && (
              <div className="bg-card border-2 border-border p-6 mb-8">
                <h3 className="text-lg font-bold mb-4">
                  Sammenligning: Nuværende vs. {comparisonMode === "best" ? "Bedste uge" : "Forrige uge"}
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* CPA Comparison */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">CPA</p>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <p className="text-2xl font-bold font-mono-data">
                          {currentWeek.cpa?.toFixed(0) || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">Nu</p>
                      </div>
                      {comparisonBaseline.cpa && currentWeek.cpa && (
                        <div
                          className={`flex items-center gap-1 ${
                            currentWeek.cpa > comparisonBaseline.cpa
                              ? "text-destructive"
                              : "text-secondary"
                          }`}
                        >
                          {currentWeek.cpa > comparisonBaseline.cpa ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5" />
                          )}
                          <span className="font-bold">
                            {Math.abs(
                              ((currentWeek.cpa - comparisonBaseline.cpa) /
                                comparisonBaseline.cpa) *
                                100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-2xl font-bold font-mono-data text-muted-foreground">
                          {comparisonBaseline.cpa?.toFixed(0) || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comparisonMode === "best" ? "Bedste" : "Forrige"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Results Comparison */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Køb</p>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <p className="text-2xl font-bold font-mono-data">
                          {currentWeek.results}
                        </p>
                        <p className="text-xs text-muted-foreground">Nu</p>
                      </div>
                      {comparisonBaseline.results > 0 && (
                        <div
                          className={`flex items-center gap-1 ${
                            currentWeek.results < comparisonBaseline.results
                              ? "text-destructive"
                              : "text-secondary"
                          }`}
                        >
                          {currentWeek.results < comparisonBaseline.results ? (
                            <ArrowDownRight className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                          <span className="font-bold">
                            {Math.abs(
                              ((currentWeek.results - comparisonBaseline.results) /
                                comparisonBaseline.results) *
                                100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-2xl font-bold font-mono-data text-muted-foreground">
                          {comparisonBaseline.results}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comparisonMode === "best" ? "Bedste" : "Forrige"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CPM Comparison */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">CPM</p>
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <p className="text-2xl font-bold font-mono-data">
                          {currentWeek.cpm.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Nu</p>
                      </div>
                      {comparisonBaseline.cpm > 0 && (
                        <div
                          className={`flex items-center gap-1 ${
                            currentWeek.cpm > comparisonBaseline.cpm
                              ? "text-destructive"
                              : "text-secondary"
                          }`}
                        >
                          {currentWeek.cpm > comparisonBaseline.cpm ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5" />
                          )}
                          <span className="font-bold">
                            {Math.abs(
                              ((currentWeek.cpm - comparisonBaseline.cpm) /
                                comparisonBaseline.cpm) *
                                100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-2xl font-bold font-mono-data text-muted-foreground">
                          {comparisonBaseline.cpm.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comparisonMode === "best" ? "Bedste" : "Forrige"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CPA Trend Chart */}
            <div className="bg-card border-2 border-border p-6 mb-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                CPA Trend over tid
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="week"
                      tickFormatter={formatWeekLabel}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${v} kr`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "0",
                      }}
                      formatter={(value: number) => [`${value?.toFixed(0)} DKK`, "CPA"]}
                      labelFormatter={(label) => `Uge: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cpa"
                      name="CPA (DKK)"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {bestWeek.week && (
                <p className="text-sm text-muted-foreground mt-4">
                  <span className="text-secondary font-bold">Bedste uge:</span> {bestWeek.week} med CPA på{" "}
                  <span className="font-mono-data font-bold">{bestWeek.cpa?.toFixed(0)} DKK</span>
                </p>
              )}
            </div>

            {/* Performance per Ad */}
            <div className="bg-card border-2 border-border p-6 mb-8">
              <h3 className="text-lg font-bold mb-4">Performance per Annonce</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-4 font-bold">Annonce</th>
                      <th className="text-right py-3 px-4 font-bold">Spend</th>
                      <th className="text-right py-3 px-4 font-bold">Køb</th>
                      <th className="text-right py-3 px-4 font-bold">CPA</th>
                      <th className="text-right py-3 px-4 font-bold">CPM</th>
                      <th className="text-right py-3 px-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adStats.sort((a, b) => (a.cpa || 999999) - (b.cpa || 999999)).map((ad) => (
                      <tr key={ad.name} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium">{ad.name}</td>
                        <td className="py-3 px-4 text-right font-mono-data">
                          {formatCurrency(ad.spend)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-data">{ad.results}</td>
                        <td className="py-3 px-4 text-right font-mono-data">
                          {ad.cpa ? `${ad.cpa.toFixed(0)} DKK` : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-data">
                          {ad.cpm.toFixed(0)} DKK
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ad.results === 0 && ad.spend > 300 ? (
                            <span className="text-destructive font-bold">STOP</span>
                          ) : ad.cpa && ad.cpa < 100 ? (
                            <span className="text-secondary font-bold">TOP</span>
                          ) : (
                            <span className="text-muted-foreground">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance per Platform */}
            <div className="bg-card border-2 border-border p-6 mb-8">
              <h3 className="text-lg font-bold mb-4">Performance per Platform</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "0",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="results" name="Køb" fill="hsl(var(--secondary))" />
                    <Bar dataKey="cpa" name="CPA (DKK)" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Upload New File Button */}
            <div className="text-center">
              <button
                onClick={() => setData([])}
                className="px-6 py-3 bg-muted text-foreground font-bold hover:bg-muted/80 transition-colors"
              >
                Upload ny fil
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
