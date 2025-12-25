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
