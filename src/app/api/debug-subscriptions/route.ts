import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    // Fetch all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.latest_invoice", "data.latest_invoice.payment_intent"],
    });

    let allSubs = subscriptions.data;
    let hasMore = subscriptions.has_more;
    let pageCount = 1;

    while (hasMore && pageCount < 50) {
      const nextPage = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: allSubs[allSubs.length - 1].id,
        expand: ["data.latest_invoice", "data.latest_invoice.payment_intent"],
      });

      allSubs = [...allSubs, ...nextPage.data];
      hasMore = nextPage.has_more;
      pageCount++;
    }

    // Count by status
    const statusCount: Record<string, number> = {};
    allSubs.forEach((sub) => {
      statusCount[sub.status] = (statusCount[sub.status] || 0) + 1;
    });

    // Check for test mode subscriptions
    const testModeCount = allSubs.filter((sub) => sub.livemode === false).length;
    const liveModeCount = allSubs.filter((sub) => sub.livemode === true).length;

    // Count active subscriptions with cancel_at_period_end
    const activeWithCancel = allSubs.filter(
      (sub) => sub.status === "active" && sub.cancel_at_period_end === true
    );

    // Count active subscriptions with cancel_at set (scheduled cancellation)
    const activeWithCancelAt = allSubs.filter(
      (sub) => sub.status === "active" && sub.cancel_at !== null
    );

    // Count our filtered "active" subscriptions
    const ourActive = allSubs.filter(
      (sub) =>
        sub.status === "trialing" ||
        (sub.status === "active" && sub.cancel_at_period_end !== true)
    );

    const ourPaying = ourActive.filter((sub) => sub.status === "active");
    const ourTrials = ourActive.filter((sub) => sub.status === "trialing");

    // Check our active subscriptions for test mode
    const ourActiveTestMode = ourActive.filter((sub) => sub.livemode === false).length;

    // Count subscriptions by interval (monthly, 6-month, annual)
    const subscriptionsByInterval: Record<string, number> = {};
    const subscriptionsByPrice: Record<number, number> = {};

    ourPaying.forEach((sub) => {
      if (sub.items && sub.items.data && sub.items.data.length > 0) {
        const item = sub.items.data[0];
        if (item.price) {
          const interval = item.price.recurring?.interval || 'unknown';
          const intervalCount = item.price.recurring?.interval_count || 1;
          const key = intervalCount > 1 ? `${interval}_${intervalCount}` : interval;
          subscriptionsByInterval[key] = (subscriptionsByInterval[key] || 0) + 1;

          const amount = item.price.unit_amount || 0;
          subscriptionsByPrice[amount] = (subscriptionsByPrice[amount] || 0) + 1;
        }
      }
    });

    // Check for subscriptions with collection issues
    const activeWithLatestInvoiceOpen = allSubs.filter(
      (sub) =>
        sub.status === "active" &&
        sub.latest_invoice &&
        typeof sub.latest_invoice === 'object' &&
        sub.latest_invoice.status === 'open'
    );

    const activeWithLatestInvoiceUnpaid = allSubs.filter(
      (sub) =>
        sub.status === "active" &&
        sub.latest_invoice &&
        typeof sub.latest_invoice === 'object' &&
        (sub.latest_invoice.status === 'open' || sub.latest_invoice.status === 'uncollectible')
    );

    // Count unique customers instead of subscriptions
    const uniqueCustomers = new Set(
      ourActive.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    const uniquePayingCustomers = new Set(
      ourPaying.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    const uniqueTrialCustomers = new Set(
      ourTrials.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    // Check for subscriptions that never had a successful payment
    const activeWithNoSuccessfulPayment = allSubs.filter(
      (sub) =>
        sub.status === "active" &&
        sub.latest_invoice &&
        typeof sub.latest_invoice === 'object' &&
        sub.latest_invoice.payment_intent &&
        typeof sub.latest_invoice.payment_intent === 'object' &&
        sub.latest_invoice.payment_intent.status !== 'succeeded'
    );

    // Check subscription ages - maybe very new subscriptions aren't counted yet?
    const now = Math.floor(Date.now() / 1000);
    const veryNewActive = ourPaying.filter(
      (sub) => now - sub.created < 3600 // Created in last hour
    );

    const recentlyCreatedActive = ourPaying.filter(
      (sub) => now - sub.created < 86400 // Created in last 24 hours
    );

    return NextResponse.json({
      total: allSubs.length,
      testModeSubscriptions: testModeCount,
      liveModeSubscriptions: liveModeCount,
      ourActiveTestMode: ourActiveTestMode,
      statusBreakdown: statusCount,
      subscriptionsByInterval: subscriptionsByInterval,
      subscriptionsByPrice: subscriptionsByPrice,
      activeWithCancelAtPeriodEnd: activeWithCancel.length,
      activeWithCancelAt: activeWithCancelAt.length,
      activeWithUnpaidInvoice: activeWithLatestInvoiceUnpaid.length,
      activeWithOpenInvoice: activeWithLatestInvoiceOpen.length,
      activeWithNoSuccessfulPayment: activeWithNoSuccessfulPayment.length,
      veryNewActiveSubscriptions: veryNewActive.length,
      last24hActiveSubscriptions: recentlyCreatedActive.length,
      ourCounts: {
        subscriptions: {
          total: ourActive.length,
          paying: ourPaying.length,
          trials: ourTrials.length,
        },
        uniqueCustomers: {
          total: uniqueCustomers.size,
          paying: uniquePayingCustomers.size,
          trials: uniqueTrialCustomers.size,
        },
      },
      expectedStripe: {
        total: 329,
        trials: 53,
        paying: 276,
      },
      difference: {
        subscriptions: {
          total: ourActive.length - 329,
          paying: ourPaying.length - 276,
          trials: ourTrials.length - 53,
        },
        uniqueCustomers: {
          total: uniqueCustomers.size - 329,
          paying: uniquePayingCustomers.size - 276,
          trials: uniqueTrialCustomers.size - 53,
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Failed to fetch debug data" }, { status: 500 });
  }
}
