import { stripe } from "./stripe";
import { withCache } from "./cache";
import type { DashboardMetrics, TrendData, ActivityEvent } from "@/types";
import { startOfMonth, subMonths, format, endOfMonth } from "date-fns";
import { da } from "date-fns/locale";

const MONTHLY_PRICE = 149; // DKK

/**
 * Get current active members count
 */
export async function getCurrentMembers(): Promise<number> {
  return withCache("current-members", async () => {
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    });

    // If there are more than 100, we need to paginate
    let allSubscriptions = subscriptions.data;
    let hasMore = subscriptions.has_more;

    while (hasMore) {
      const nextPage = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        starting_after: allSubscriptions[allSubscriptions.length - 1].id,
        expand: ["data.customer"],
      });

      allSubscriptions = [...allSubscriptions, ...nextPage.data];
      hasMore = nextPage.has_more;
    }

    return allSubscriptions.length;
  });
}

/**
 * Calculate Monthly Recurring Revenue (MRR)
 */
export async function calculateMRR(): Promise<number> {
  const members = await getCurrentMembers();
  return members * MONTHLY_PRICE;
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
 * Get all dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return withCache("dashboard-metrics", async () => {
    const [
      currentMembers,
      mrr,
      totalRevenue,
      newSignupsThisMonth,
      cancellationsThisMonth,
      churnRate,
      growthRate,
    ] = await Promise.all([
      getCurrentMembers(),
      calculateMRR(),
      calculateTotalRevenue(),
      getNewSignupsThisMonth(),
      getCancellationsThisMonth(),
      calculateChurnRate(),
      calculateGrowthRate(),
    ]);

    return {
      currentMembers,
      mrr,
      totalRevenue,
      newSignupsThisMonth,
      cancellationsThisMonth,
      churnRate,
      growthRate,
    };
  });
}

/**
 * Get growth trends for last 12 months
 */
export async function getGrowthTrends(): Promise<TrendData[]> {
  return withCache("growth-trends", async () => {
    const trends: TrendData[] = [];

    for (let i = 11; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const startTimestamp = Math.floor(startOfMonth(month).getTime() / 1000);
      const endTimestamp = Math.floor(endOfMonth(month).getTime() / 1000);

      // Get signups for this month
      const signupEvents = await stripe.events.list({
        type: "customer.subscription.created",
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
      });

      // Get cancellations for this month
      const cancelEvents = await stripe.events.list({
        type: "customer.subscription.deleted",
        created: {
          gte: startTimestamp,
          lte: endTimestamp,
        },
        limit: 100,
      });

      const netGrowth = signupEvents.data.length - cancelEvents.data.length;

      // Calculate cumulative members
      const previousMembers = i === 11 ? 0 : trends[trends.length - 1]?.members || 0;
      const currentMembers = previousMembers + netGrowth;

      trends.push({
        month: format(month, "MMM yyyy", { locale: da }),
        members: Math.max(0, currentMembers),
        revenue: Math.max(0, currentMembers) * MONTHLY_PRICE,
      });
    }

    // Normalize to current member count
    const currentActualMembers = await getCurrentMembers();
    const lastTrendMembers = trends[trends.length - 1]?.members || 0;

    if (lastTrendMembers > 0) {
      const diff = currentActualMembers - lastTrendMembers;
      trends[trends.length - 1].members = currentActualMembers;
      trends[trends.length - 1].revenue = currentActualMembers * MONTHLY_PRICE;
    }

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
