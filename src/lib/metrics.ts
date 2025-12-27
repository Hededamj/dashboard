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
 * Get all active and trialing subscriptions
 */
async function getAllActiveSubscriptions() {
  const subscriptions = await stripe.subscriptions.list({
    status: "all", // Get all to filter trialing and active
    limit: 100,
    expand: ["data.customer"],
  });

  let allSubscriptions = subscriptions.data;
  let hasMore = subscriptions.has_more;

  while (hasMore) {
    const nextPage = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      starting_after: allSubscriptions[allSubscriptions.length - 1].id,
      expand: ["data.customer"],
    });

    allSubscriptions = [...allSubscriptions, ...nextPage.data];
    hasMore = nextPage.has_more;
  }

  // Only return active and trialing subscriptions
  return allSubscriptions.filter(
    (sub) => sub.status === "active" || sub.status === "trialing"
  );
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
  const startOfCurrentMonth = startOfMonth(new Date());
  const startTimestamp = Math.floor(startOfCurrentMonth.getTime() / 1000);

  // Get all active subscriptions
  const activeSubscriptions = await stripe.subscriptions.list({
    status: "active",
    limit: 100,
  });

  let allActive = activeSubscriptions.data;
  let hasMore = activeSubscriptions.has_more;

  while (hasMore) {
    const nextPage = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      starting_after: allActive[allActive.length - 1].id,
    });

    allActive = [...allActive, ...nextPage.data];
    hasMore = nextPage.has_more;
  }

  // Count those that existed at start of month
  const membersAtStart = allActive.filter(
    (sub) => sub.created < startTimestamp
  ).length;

  return membersAtStart;
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

    // Handle pagination
    let allEvents = events.data;
    let hasMore = events.has_more;

    while (hasMore) {
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
    }

    return allEvents.length;
  });
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

    // Handle pagination
    let allEvents = events.data;
    let hasMore = events.has_more;

    while (hasMore) {
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
    }

    return allEvents.length;
  });
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
 * Get growth trends for last 12 months
 * Fetches ALL subscriptions once, then calculates monthly stats
 */
export async function getGrowthTrends(): Promise<TrendData[]> {
  return withCache("growth-trends-v2", async () => {
    // Fetch ALL subscriptions (no limit)
    console.log('[Trends] Fetching all subscriptions...');
    const allSubs = await stripe.subscriptions.list({
      limit: 100,
      status: "all",
    });

    let allSubscriptions = allSubs.data;
    let hasMore = allSubs.has_more;
    let pageCount = 1;

    // Paginate to get ALL subscriptions (removed 5000 limit)
    while (hasMore) {
      const nextPage = await stripe.subscriptions.list({
        limit: 100,
        status: "all",
        starting_after: allSubscriptions[allSubscriptions.length - 1].id,
      });

      allSubscriptions = [...allSubscriptions, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;

      // Log progress every 10 pages
      if (pageCount % 10 === 0) {
        console.log(`[Trends] Fetched ${allSubscriptions.length} subscriptions...`);
      }
    }

    console.log(`[Trends] Total subscriptions fetched: ${allSubscriptions.length}`);

    const trends: TrendData[] = [];

    // Calculate trends for last 12 months
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const startTimestamp = Math.floor(monthStart.getTime() / 1000);
      const endTimestamp = Math.floor(monthEnd.getTime() / 1000);

      // Count subscriptions that were active during this month
      const activeInMonth = allSubscriptions.filter((sub) => {
        const created = sub.created;
        const canceled = sub.canceled_at || null;

        // Subscription was created before month end
        const wasCreated = created <= endTimestamp;

        // Subscription was either not canceled, or canceled after month start
        const stillActive = !canceled || canceled >= startTimestamp;

        return wasCreated && stillActive;
      });

      const memberCount = activeInMonth.length;

      trends.push({
        month: format(month, "MMM yyyy", { locale: da }),
        members: memberCount,
        revenue: memberCount * MONTHLY_PRICE,
      });
    }

    console.log('[Trends] Calculated trends for 12 months');
    return trends;
  }, 10 * 60 * 1000); // Cache for 10 minutes (longer because this is expensive)
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
