export interface DashboardMetrics {
  currentMembers: number;
  mrr: number;
  totalRevenue: number;
  newSignupsThisMonth: number;
  cancellationsThisMonth: number;
  churnRate: number;
  growthRate: number;
}

export interface TrendData {
  month: string;
  members: number;
  revenue: number;
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
