export interface MetricComparison {
  current: number;
  previous: number;
  change: number; // Percentage change
  trend: "up" | "down" | "neutral";
}

export interface DashboardMetrics {
  currentMembers: number;
  payingMembers: number;
  trialMembers: number;
  mrr: number;
  totalRevenue: number;
  newSignupsThisMonth: number;
  cancellationsThisMonth: number;
  churnRate: number;
  growthRate: number;
  // Period comparisons (optional for backward compatibility)
  newSignupsComparison?: MetricComparison;
  mrrComparison?: MetricComparison;
  revenueComparison?: MetricComparison;
}

export interface TrendData {
  month: string;
  members: number;
  revenue: number;
  previousMembers?: number;
  previousRevenue?: number;
}

export interface ActivityEvent {
  id: string;
  type: "signup" | "cancel";
  email: string;
  date: string;
  amount?: number;
  activePeriods?: number; // Number of billing periods the member has been active
}

export interface DashboardData {
  metrics: DashboardMetrics;
  trends: TrendData[];
  recentActivity: ActivityEvent[];
}

export interface AnalyticsMetrics {
  // Unit Economics
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
  ltvCacRatio: number; // LTV:CAC ratio (should be >3)
  paybackPeriod: number; // Months to recover CAC

  // Conversion
  freeTrialConversionRate: number; // % of trials that convert to paid

  // Growth
  netMrrGrowth: number; // Net MRR change this month
  quickRatio: number; // (New+Expansion MRR) / Churned MRR

  // Breakdown
  membershipBreakdown: {
    monthly: number;
    sixMonth: number;
    twelveMonth: number;
    other: number;
  };

  // Trends over time
  cacTrend: TrendData[];
  conversionTrend: TrendData[];
}
