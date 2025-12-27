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
}

export interface DashboardData {
  metrics: DashboardMetrics;
  trends: TrendData[];
  recentActivity: ActivityEvent[];
}
