import { stripe } from "./stripe";
import { withCache } from "./cache";
import type { DashboardMetrics, TrendData, ActivityEvent, MetricComparison } from "@/types";
import {
  startOfMonth,
  subMonths,
  format,
  endOfMonth,
  subDays,
  startOfDay,
  startOfYear,
  startOfToday,
  startOfYesterday,
  endOfYesterday,
  endOfToday,
  subWeeks
} from "date-fns";
import { da } from "date-fns/locale";

const MONTHLY_PRICE = 149; // DKK

export type PeriodType =
  | "today"
  | "yesterday"
  | "last7days"
  | "last4weeks"
  | "last3months"
  | "last12months"
  | "monthToDate"
  | "lastMonth"
  | "yearToDate"
  | "allTime";

interface DateRange {
  start: Date;
  end: Date;
  compareStart: Date;
  compareEnd: Date;
}

/**
 * Calculate date ranges based on period type
 */
export function getDateRangeForPeriod(period: PeriodType): DateRange {
  const now = new Date();
  const today = startOfToday();

  switch (period) {
    case "today": {
      const start = today;
      const end = endOfToday();
      const compareStart = subDays(start, 1);
      const compareEnd = endOfYesterday();
      return { start, end, compareStart, compareEnd };
    }

    case "yesterday": {
      const start = startOfYesterday();
      const end = endOfYesterday();
      const compareStart = subDays(start, 1);
      const compareEnd = subDays(end, 1);
      return { start, end, compareStart, compareEnd };
    }

    case "last7days": {
      const end = now;
      const start = subDays(end, 7);
      const compareEnd = start;
      const compareStart = subDays(compareEnd, 7);
      return { start, end, compareStart, compareEnd };
    }

    case "last4weeks": {
      const end = now;
      const start = subDays(end, 28);
      const compareEnd = start;
      const compareStart = subDays(compareEnd, 28);
      return { start, end, compareStart, compareEnd };
    }

    case "last3months": {
      const end = now;
      const start = subMonths(end, 3);
      const compareEnd = start;
      const compareStart = subMonths(compareEnd, 3);
      return { start, end, compareStart, compareEnd };
    }

    case "last12months": {
      const end = now;
      const start = subMonths(end, 12);
      const compareEnd = start;
      const compareStart = subMonths(compareEnd, 12);
      return { start, end, compareStart, compareEnd };
    }

    case "monthToDate": {
      const start = startOfMonth(now);
      const end = now;
      const compareStart = startOfMonth(subMonths(now, 1));
      const compareEnd = subMonths(end, 1);
      return { start, end, compareStart, compareEnd };
    }

    case "lastMonth": {
      const start = startOfMonth(subMonths(now, 1));
      const end = endOfMonth(subMonths(now, 1));
      const compareStart = startOfMonth(subMonths(now, 2));
      const compareEnd = endOfMonth(subMonths(now, 2));
      return { start, end, compareStart, compareEnd };
    }

    case "yearToDate": {
      const start = startOfYear(now);
      const end = now;
      const compareStart = startOfYear(subMonths(now, 12));
      const compareEnd = subMonths(end, 12);
      return { start, end, compareStart, compareEnd };
    }

    case "allTime": {
      // For all time, we'll use a very old date as start
      const start = new Date(2020, 0, 1); // Jan 1, 2020
      const end = now;
      const compareStart = new Date(2020, 0, 1);
      const compareEnd = new Date(2020, 0, 1);
      return { start, end, compareStart, compareEnd };
    }

    default:
      return getDateRangeForPeriod("last4weeks");
  }
}

/**
 * Calculate percentage change between current and previous values
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Create metric comparison object
 */
function createComparison(current: number, previous: number): MetricComparison {
  const change = calculateChange(current, previous);
  return {
    current,
    previous,
    change,
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  };
}

/**
 * Fetch all subscriptions (shared cache for all functions)
 * This is the single source of truth for subscription data
 */
async function fetchAllSubscriptions() {
  return withCache("all-subscriptions-v2", async () => {
    console.log('[Subscriptions] Fetching ALL subscriptions from Stripe...');
    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer"],
    });

    let allSubscriptions = subscriptions.data;
    let hasMore = subscriptions.has_more;
    let pageCount = 1;
    const MAX_PAGES = 50; // Limit to 5000 subscriptions max

    while (hasMore && pageCount < MAX_PAGES) {
      const nextPage = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: allSubscriptions[allSubscriptions.length - 1].id,
        expand: ["data.customer"],
      });

      allSubscriptions = [...allSubscriptions, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    console.log(`[Subscriptions] Fetched ${allSubscriptions.length} subscriptions (CACHED)`);
    return allSubscriptions;
  }, 30 * 60 * 1000); // Cache for 30 minutes - shared across all functions
}

/**
 * Get all active and trialing subscriptions
 * Uses shared cached subscription data
 * Excludes active subscriptions that are canceled (cancel_at_period_end = true)
 * but includes ALL trialing subscriptions (even canceled ones, as they're still in trial)
 */
async function getAllActiveSubscriptions() {
  const allSubscriptions = await fetchAllSubscriptions();

  // Filter logic:
  // - Include ALL trialing subscriptions (even if canceled, they're still active trials)
  // - Include active subscriptions ONLY if they will renew (cancel_at_period_end !== true)
  const activeAndTrialing = allSubscriptions.filter(
    (sub) =>
      sub.status === "trialing" ||
      (sub.status === "active" && sub.cancel_at_period_end !== true)
  );

  console.log(`[Subscriptions] ${activeAndTrialing.length} active/trialing subscriptions`);
  return activeAndTrialing;
}

/**
 * Get current trial members count
 */
export async function getTrialMembers(): Promise<number> {
  return withCache("trial-members", async () => {
    const allSubs = await getAllActiveSubscriptions();
    return allSubs.filter((sub) => sub.status === "trialing").length;
  });
}

/**
 * Get current paying members count (active but not trialing)
 */
export async function getPayingMembers(): Promise<number> {
  return withCache("paying-members", async () => {
    const allSubs = await getAllActiveSubscriptions();
    return allSubs.filter((sub) => sub.status === "active").length;
  });
}

/**
 * Get current active members count (total: trial + paying)
 */
export async function getCurrentMembers(): Promise<number> {
  return withCache("current-members", async () => {
    const allSubs = await getAllActiveSubscriptions();
    return allSubs.length;
  });
}

/**
 * Calculate Monthly Recurring Revenue (MRR)
 * Only counts paying members (not trials)
 */
export async function calculateMRR(): Promise<number> {
  const payingMembers = await getPayingMembers();
  return payingMembers * MONTHLY_PRICE;
}

/**
 * Get members count at start of current month
 */
async function getMembersAtStartOfMonth(): Promise<number> {
  return withCache("members-at-month-start", async () => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const startTimestamp = Math.floor(startOfCurrentMonth.getTime() / 1000);

    // Get all active subscriptions
    const activeSubscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });

    let allActive = activeSubscriptions.data;
    let hasMore = activeSubscriptions.has_more;
    let pageCount = 1;
    const MAX_PAGES = 50; // Limit to 5000 subscriptions max

    while (hasMore && pageCount < MAX_PAGES) {
      const nextPage = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: allActive[allActive.length - 1].id,
      });

      allActive = [...allActive, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    // Count those that existed at start of month
    const membersAtStart = allActive.filter(
      (sub) => sub.created < startTimestamp
    ).length;

    return membersAtStart;
  }, 30 * 60 * 1000); // Cache for 30 minutes
}

/**
 * Get new signups this month
 */
export async function getNewSignupsThisMonth(): Promise<number> {
  return withCache("new-signups-month", async () => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const startTimestamp = Math.floor(startOfCurrentMonth.getTime() / 1000);

    const events = await stripe.events.list({
      type: "customer.subscription.created",
      created: {
        gte: startTimestamp,
      },
      limit: 100,
    });

    // Handle pagination with limit
    let allEvents = events.data;
    let hasMore = events.has_more;
    let pageCount = 1;
    const MAX_PAGES = 10; // Limit to 1000 events max (should be enough for monthly signups)

    while (hasMore && pageCount < MAX_PAGES) {
      const nextPage = await stripe.events.list({
        type: "customer.subscription.created",
        created: {
          gte: startTimestamp,
        },
        limit: 100,
        starting_after: allEvents[allEvents.length - 1].id,
      });

      allEvents = [...allEvents, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    return allEvents.length;
  }, 15 * 60 * 1000); // Cache for 15 minutes
}

/**
 * Get signups for a specific date range (using subscription created dates)
 */
async function getSignupsForPeriod(startDate: Date, endDate: Date): Promise<number> {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const subs = await stripe.subscriptions.list({
    created: {
      gte: startTimestamp,
      lte: endTimestamp,
    },
    limit: 100,
  });

  let allSubs = subs.data;
  let hasMore = subs.has_more;

  while (hasMore && allSubs.length < 1000) {
    const nextPage = await stripe.subscriptions.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
      starting_after: allSubs[allSubs.length - 1].id,
    });

    allSubs = [...allSubs, ...nextPage.data];
    hasMore = nextPage.has_more;
  }

  return allSubs.length;
}

/**
 * Get cancellations this month
 */
export async function getCancellationsThisMonth(): Promise<number> {
  return withCache("cancellations-month", async () => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const startTimestamp = Math.floor(startOfCurrentMonth.getTime() / 1000);

    const events = await stripe.events.list({
      type: "customer.subscription.deleted",
      created: {
        gte: startTimestamp,
      },
      limit: 100,
    });

    // Handle pagination with limit
    let allEvents = events.data;
    let hasMore = events.has_more;
    let pageCount = 1;
    const MAX_PAGES = 10; // Limit to 1000 events max (should be enough for monthly cancellations)

    while (hasMore && pageCount < MAX_PAGES) {
      const nextPage = await stripe.events.list({
        type: "customer.subscription.deleted",
        created: {
          gte: startTimestamp,
        },
        limit: 100,
        starting_after: allEvents[allEvents.length - 1].id,
      });

      allEvents = [...allEvents, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    return allEvents.length;
  }, 15 * 60 * 1000); // Cache for 15 minutes
}

/**
 * Calculate churn rate for current month
 */
export async function calculateChurnRate(): Promise<number> {
  const membersAtStart = await getMembersAtStartOfMonth();
  const cancellations = await getCancellationsThisMonth();

  if (membersAtStart === 0) {
    return 0;
  }

  return (cancellations / membersAtStart) * 100;
}

/**
 * Calculate growth rate
 */
export async function calculateGrowthRate(): Promise<number> {
  const signups = await getNewSignupsThisMonth();
  const cancellations = await getCancellationsThisMonth();
  const membersAtStart = await getMembersAtStartOfMonth();

  if (membersAtStart === 0) {
    return 0;
  }

  const netGrowth = signups - cancellations;
  return (netGrowth / membersAtStart) * 100;
}

/**
 * Calculate total revenue (from successful invoices)
 */
export async function calculateTotalRevenue(): Promise<number> {
  return withCache("total-revenue", async () => {
    const invoices = await stripe.invoices.list({
      status: "paid",
      limit: 100,
    });

    let allInvoices = invoices.data;
    let hasMore = invoices.has_more;

    while (hasMore && allInvoices.length < 1000) {
      // Limit to prevent excessive API calls
      const nextPage = await stripe.invoices.list({
        status: "paid",
        limit: 100,
        starting_after: allInvoices[allInvoices.length - 1].id,
      });

      allInvoices = [...allInvoices, ...nextPage.data];
      hasMore = nextPage.has_more;
    }

    // Sum up all paid invoices (convert from øre to DKK)
    const total = allInvoices.reduce((sum, invoice) => sum + invoice.amount_paid, 0);

    return total / 100; // Convert from øre to DKK
  });
}

/**
 * Get all dashboard metrics with period-based comparisons
 */
export async function getDashboardMetrics(period: PeriodType = "last4weeks"): Promise<DashboardMetrics> {
  return withCache(`dashboard-metrics-${period}`, async () => {
    const [
      currentMembers,
      payingMembers,
      trialMembers,
      mrr,
      totalRevenue,
      newSignupsThisMonth,
      cancellationsThisMonth,
      churnRate,
      growthRate,
    ] = await Promise.all([
      getCurrentMembers(),
      getPayingMembers(),
      getTrialMembers(),
      calculateMRR(),
      calculateTotalRevenue(),
      getNewSignupsThisMonth(),
      getCancellationsThisMonth(),
      calculateChurnRate(),
      calculateGrowthRate(),
    ]);

    // Get date ranges based on selected period
    const dateRange = getDateRangeForPeriod(period);

    const [currentPeriodSignups, previousPeriodSignups] = await Promise.all([
      getSignupsForPeriod(dateRange.start, dateRange.end),
      period === "allTime"
        ? Promise.resolve(0) // No comparison for all time
        : getSignupsForPeriod(dateRange.compareStart, dateRange.compareEnd),
    ]);

    // MRR comparison (estimate based on new signups)
    const currentPeriodMRR = currentPeriodSignups * MONTHLY_PRICE;
    const previousPeriodMRR = previousPeriodSignups * MONTHLY_PRICE;

    return {
      currentMembers,
      payingMembers,
      trialMembers,
      mrr,
      totalRevenue,
      newSignupsThisMonth,
      cancellationsThisMonth,
      churnRate,
      growthRate,
      // Period-based comparisons
      newSignupsComparison: createComparison(currentPeriodSignups, previousPeriodSignups),
      mrrComparison: createComparison(currentPeriodMRR, previousPeriodMRR),
    };
  });
}

/**
 * Helper: Count active subscriptions in a time range
 */
function countActiveInRange(
  allSubscriptions: any[],
  startTimestamp: number,
  endTimestamp: number
): number {
  return allSubscriptions.filter((sub) => {
    const created = sub.created;
    const canceled = sub.canceled_at || null;
    const wasCreated = created <= endTimestamp;
    const stillActive = !canceled || canceled >= startTimestamp;
    return wasCreated && stillActive;
  }).length;
}

/**
 * Get growth trends based on selected period
 * Uses shared cached subscription data for fast period switching
 * Includes comparison with previous period
 */
export async function getGrowthTrends(period: PeriodType = "last4weeks"): Promise<TrendData[]> {
  console.log(`[Trends] Calculating trends for period: ${period}...`);

  // Use shared cached subscription data
  const allSubscriptions = await fetchAllSubscriptions();

  const trends: TrendData[] = [];
  const now = new Date();

  // Determine granularity based on period
  if (period === "today" || period === "yesterday") {
    // Show last 7 days for context (with previous 7 days comparison)
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const prevDay = subDays(day, 7);

      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const prevDayStart = startOfDay(prevDay);
      const prevDayEnd = new Date(prevDayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const memberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(dayStart.getTime() / 1000),
        Math.floor(dayEnd.getTime() / 1000)
      );

      const prevMemberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(prevDayStart.getTime() / 1000),
        Math.floor(prevDayEnd.getTime() / 1000)
      );

      trends.push({
        month: format(day, "d. MMM", { locale: da }),
        members: memberCount,
        revenue: memberCount * MONTHLY_PRICE,
        previousMembers: prevMemberCount,
        previousRevenue: prevMemberCount * MONTHLY_PRICE,
      });
    }
  } else if (period === "last7days" || period === "last4weeks") {
    // Show daily for last N days (with previous N days comparison)
    const days = period === "last7days" ? 7 : 28;
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(now, i);
      const prevDay = subDays(day, days);

      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const prevDayStart = startOfDay(prevDay);
      const prevDayEnd = new Date(prevDayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

      const memberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(dayStart.getTime() / 1000),
        Math.floor(dayEnd.getTime() / 1000)
      );

      const prevMemberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(prevDayStart.getTime() / 1000),
        Math.floor(prevDayEnd.getTime() / 1000)
      );

      trends.push({
        month: format(day, "d. MMM", { locale: da }),
        members: memberCount,
        revenue: memberCount * MONTHLY_PRICE,
        previousMembers: prevMemberCount,
        previousRevenue: prevMemberCount * MONTHLY_PRICE,
      });
    }
  } else if (period === "last3months" || period === "monthToDate" || period === "lastMonth") {
    // Show weekly for last 12 weeks (with previous 12 weeks comparison)
    for (let i = 11; i >= 0; i--) {
      const weekStart = subWeeks(now, i);
      const prevWeekStart = subWeeks(weekStart, 12);

      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      const prevWeekEnd = new Date(prevWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      const memberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(weekStart.getTime() / 1000),
        Math.floor(weekEnd.getTime() / 1000)
      );

      const prevMemberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(prevWeekStart.getTime() / 1000),
        Math.floor(prevWeekEnd.getTime() / 1000)
      );

      trends.push({
        month: format(weekStart, "d. MMM", { locale: da }),
        members: memberCount,
        revenue: memberCount * MONTHLY_PRICE,
        previousMembers: prevMemberCount,
        previousRevenue: prevMemberCount * MONTHLY_PRICE,
      });
    }
  } else {
    // Show monthly for last12months, yearToDate, allTime (with previous period comparison)
    const months = period === "allTime" ? 24 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const month = subMonths(now, i);
      const prevMonth = subMonths(month, months);

      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const prevMonthStart = startOfMonth(prevMonth);
      const prevMonthEnd = endOfMonth(prevMonth);

      const memberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(monthStart.getTime() / 1000),
        Math.floor(monthEnd.getTime() / 1000)
      );

      const prevMemberCount = countActiveInRange(
        allSubscriptions,
        Math.floor(prevMonthStart.getTime() / 1000),
        Math.floor(prevMonthEnd.getTime() / 1000)
      );

      trends.push({
        month: format(month, "MMM yyyy", { locale: da }),
        members: memberCount,
        revenue: memberCount * MONTHLY_PRICE,
        previousMembers: prevMemberCount,
        previousRevenue: prevMemberCount * MONTHLY_PRICE,
      });
    }
  }

  console.log(`[Trends] Calculated ${trends.length} data points for period: ${period} (with comparison)`);
  return trends;
}

/**
 * Get recent activity (signups and cancellations)
 */
export async function getRecentActivity(): Promise<ActivityEvent[]> {
  return withCache("recent-activity", async () => {
    const [signupEvents, cancelEvents] = await Promise.all([
      stripe.events.list({
        type: "customer.subscription.created",
        limit: 20,
      }),
      stripe.events.list({
        type: "customer.subscription.deleted",
        limit: 20,
      }),
    ]);

    const activities: ActivityEvent[] = [];

    // Process signups
    for (const event of signupEvents.data) {
      const subscription = event.data.object as any;
      const customer = subscription.customer;

      let email = "Unknown";
      if (typeof customer === "string") {
        try {
          const customerObj = await stripe.customers.retrieve(customer);
          if (!customerObj.deleted && customerObj.email) {
            email = customerObj.email;
          }
        } catch (e) {
          // Ignore errors
        }
      } else if (customer && customer.email) {
        email = customer.email;
      }

      activities.push({
        id: event.id,
        type: "signup",
        email,
        date: new Date(event.created * 1000).toISOString(),
        amount: MONTHLY_PRICE,
      });
    }

    // Process cancellations
    for (const event of cancelEvents.data) {
      const subscription = event.data.object as any;
      const customer = subscription.customer;

      let email = "Unknown";
      if (typeof customer === "string") {
        try {
          const customerObj = await stripe.customers.retrieve(customer);
          if (!customerObj.deleted && customerObj.email) {
            email = customerObj.email;
          }
        } catch (e) {
          // Ignore errors
        }
      } else if (customer && customer.email) {
        email = customer.email;
      }

      activities.push({
        id: event.id,
        type: "cancel",
        email,
        date: new Date(event.created * 1000).toISOString(),
      });
    }

    // Sort by date (newest first)
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return activities.slice(0, 20);
  });
}

/**
 * Calculate analytics metrics (LTV, CAC, ratios, etc.)
 * TODO: Replace hardcoded marketing spend with dynamic data
 */
export async function getAnalyticsMetrics(): Promise<any> {
  const [
    payingMembers,
    trialMembers,
    churnRate,
    mrr,
    ltv,
  ] = await Promise.all([
    getPayingMembers(),
    getTrialMembers(),
    calculateChurnRate(),
    calculateMRR(),
    calculateRetentionRevenueLTV(), // Use retention-based LTV
  ]);

  // Calculate ARPS (Average Revenue Per Subscriber)
  const arps = payingMembers > 0 ? mrr / payingMembers : 0;

  // TODO: Get marketing spend from settings/API
  // For now, using average from Excel sheet
  const monthlyMarketingSpend = 15000; // DKK
  const newCustomersThisMonth = await getNewSignupsThisMonth();

  // Calculate CAC (Customer Acquisition Cost)
  const cac = newCustomersThisMonth > 0 ? monthlyMarketingSpend / newCustomersThisMonth : 0;

  // Calculate LTV:CAC Ratio (should be >3)
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  // Calculate Payback Period (months to recover CAC)
  const paybackPeriod = arps > 0 ? cac / arps : 0;

  // Calculate Free Trial Conversion Rate
  // For now, rough estimate based on trial vs paying ratio
  const totalMembers = payingMembers + trialMembers;
  const freeTrialConversionRate = totalMembers > 0 ? (payingMembers / totalMembers) * 100 : 0;

  // Net MRR Growth (simplified - just MRR change)
  // TODO: Calculate actual new MRR - churned MRR
  const netMrrGrowth = mrr * (1 - churnRate / 100) - mrr; // Approximation

  // Quick Ratio (for now, simplified)
  const quickRatio = churnRate > 0 ? (100 / churnRate) : 10;

  return {
    ltv: Math.round(ltv),
    cac: Math.round(cac),
    ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
    paybackPeriod: Math.round(paybackPeriod * 10) / 10,
    freeTrialConversionRate: Math.round(freeTrialConversionRate * 10) / 10,
    netMrrGrowth: Math.round(netMrrGrowth),
    quickRatio: Math.round(quickRatio * 10) / 10,
    membershipBreakdown: {
      monthly: payingMembers, // TODO: Get actual breakdown from Stripe
      sixMonth: 0,
      twelveMonth: 0,
      other: 0,
    },
    cacTrend: [], // TODO: Implement
    conversionTrend: [], // TODO: Implement
  };
}


/**
 * Calculate cohort retention data
 * Groups customers by signup month and tracks retention over time
 */
async function calculateCohortRetention() {
  const allSubscriptions = await fetchAllSubscriptions();
  
  // Group subscriptions by signup month (cohort)
  const cohorts: Record<string, any[]> = {};
  
  allSubscriptions.forEach(sub => {
    const signupDate = new Date(sub.created * 1000);
    const cohortKey = format(startOfMonth(signupDate), 'yyyy-MM');
    
    if (!cohorts[cohortKey]) {
      cohorts[cohortKey] = [];
    }
    cohorts[cohortKey].push(sub);
  });

  // Calculate retention for each cohort
  const cohortRetention: Record<string, number[]> = {};
  
  Object.entries(cohorts).forEach(([cohortKey, subs]) => {
    const cohortStart = new Date(cohortKey + '-01');
    const retention: number[] = [];
    
    // Calculate retention for months 0-12
    for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
      const checkDate = new Date(cohortStart);
      checkDate.setMonth(checkDate.getMonth() + monthOffset);
      const checkTimestamp = Math.floor(checkDate.getTime() / 1000);
      const monthEnd = endOfMonth(checkDate);
      const endTimestamp = Math.floor(monthEnd.getTime() / 1000);
      
      // Count how many from this cohort are still active at this month
      const stillActive = subs.filter(sub => {
        const canceled = sub.canceled_at || null;
        const wasCreated = sub.created <= endTimestamp;
        const stillSubscribed = !canceled || canceled >= checkTimestamp;
        return wasCreated && stillSubscribed;
      });
      
      const retentionPercent = (stillActive.length / subs.length) * 100;
      retention.push(retentionPercent);
    }
    
    cohortRetention[cohortKey] = retention;
  });

  return cohortRetention;
}

/**
 * Calculate average retention curve across all cohorts
 */
async function calculateAverageRetentionCurve(): Promise<number[]> {
  const cohortRetention = await calculateCohortRetention();
  const cohortKeys = Object.keys(cohortRetention);
  
  if (cohortKeys.length === 0) {
    return [100, 85, 75, 68, 62, 58, 55, 52, 50, 48, 46, 45, 44];
  }

  const avgRetention: number[] = [];
  
  for (let monthOffset = 0; monthOffset <= 12; monthOffset++) {
    let sum = 0;
    let count = 0;
    
    cohortKeys.forEach(key => {
      const retention = cohortRetention[key];
      if (retention[monthOffset] !== undefined) {
        sum += retention[monthOffset];
        count++;
      }
    });
    
    avgRetention.push(count > 0 ? sum / count : 0);
  }
  
  return avgRetention;
}

/**
 * Calculate LTV using Retention Revenue method
 */
export async function calculateRetentionRevenueLTV(): Promise<number> {
  return withCache('ltv-retention-revenue', async () => {
    const [arps, retentionCurve] = await Promise.all([
      calculateMRR().then(async (mrr) => {
        const paying = await getPayingMembers();
        return paying > 0 ? mrr / paying : 0;
      }),
      calculateAverageRetentionCurve(),
    ]);

    let ltv = 0;
    
    for (let month = 0; month < retentionCurve.length; month++) {
      const retentionPercent = retentionCurve[month] / 100;
      ltv += retentionPercent * arps;
    }
    
    console.log('[LTV] Retention Revenue LTV:', ltv.toFixed(2), 'DKK');
    console.log('[LTV] Based on ARPS:', arps.toFixed(2), 'DKK');
    
    return ltv;
  }, 30 * 60 * 1000);
}
