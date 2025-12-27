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

    // NEW: Check for subscriptions with $0 or null MRR
    const zeroMrrSubscriptions = ourPaying.filter((sub) => {
      if (!sub.items || !sub.items.data || sub.items.data.length === 0) {
        return true; // No items = $0 MRR
      }
      const item = sub.items.data[0];
      if (!item.price || item.price.unit_amount === null || item.price.unit_amount === 0) {
        return true; // No price or $0 price
      }
      return false;
    });

    // NEW: Calculate actual total MRR from all paying subscriptions
    let actualTotalMRR = 0;
    const customerMRR: Record<string, number> = {}; // MRR per customer

    ourPaying.forEach((sub) => {
      if (sub.items && sub.items.data && sub.items.data.length > 0) {
        const item = sub.items.data[0];
        if (item.price && item.price.unit_amount) {
          const amount = item.price.unit_amount / 100; // Convert from øre to DKK
          const interval = item.price.recurring?.interval || 'month';
          const intervalCount = item.price.recurring?.interval_count || 1;

          // Convert to monthly MRR
          let monthlyAmount = amount;
          if (interval === 'year') {
            monthlyAmount = amount / 12;
          } else if (interval === 'month' && intervalCount === 6) {
            monthlyAmount = amount / 6;
          } else if (interval === 'month' && intervalCount > 1) {
            monthlyAmount = amount / intervalCount;
          }

          actualTotalMRR += monthlyAmount;

          // Track per customer
          const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
          customerMRR[customerId] = (customerMRR[customerId] || 0) + monthlyAmount;
        }
      }
    });

    // NEW: Count customers by MRR amount
    const customersByMRR: Record<string, number> = {
      'zero': 0,
      'under_100': 0,
      '100_to_149': 0,
      '149': 0,
      '150_to_500': 0,
      'over_500': 0,
    };

    Object.values(customerMRR).forEach((mrr) => {
      if (mrr === 0) {
        customersByMRR['zero']++;
      } else if (mrr < 100) {
        customersByMRR['under_100']++;
      } else if (mrr >= 100 && mrr < 149) {
        customersByMRR['100_to_149']++;
      } else if (Math.abs(mrr - 149) < 1) {
        customersByMRR['149']++;
      } else if (mrr > 149 && mrr <= 500) {
        customersByMRR['150_to_500']++;
      } else {
        customersByMRR['over_500']++;
      }
    });

    // NEW: Customers with zero MRR
    const customersWithZeroMRR = Object.entries(customerMRR)
      .filter(([_, mrr]) => mrr === 0)
      .map(([customerId, _]) => customerId);

    // NEW: Check for coupons and discounts
    const subscriptionsWithCoupons = ourPaying.filter((sub) => {
      return sub.discount !== null ||
             (sub.items?.data?.[0]?.price?.recurring?.trial_period_days !== undefined);
    });

    const customersWithCoupons = new Set(
      subscriptionsWithCoupons.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    // NEW: Check subscription ages and recent changes
    const last4WeeksTimestamp = now - (28 * 24 * 60 * 60); // 4 weeks ago
    const last24HoursTimestamp = now - (24 * 60 * 60);

    const createdInLast4Weeks = ourPaying.filter((sub) => sub.created >= last4WeeksTimestamp);
    const createdBefore4Weeks = ourPaying.filter((sub) => sub.created < last4WeeksTimestamp);

    const uniqueCustomersCreatedInLast4Weeks = new Set(
      createdInLast4Weeks.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    const uniqueCustomersCreatedBefore4Weeks = new Set(
      createdBefore4Weeks.map((sub) =>
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id
      )
    );

    // NEW: Check for subscriptions updated recently (status changes)
    const updatedInLast24Hours = ourPaying.filter((sub) => {
      const currentPeriodStart = sub.current_period_start || 0;
      const statusTransitions = (sub as any).status_transitions;
      const latestUpdate = Math.max(
        currentPeriodStart,
        statusTransitions?.trial_end || 0,
        statusTransitions?.canceled_at || 0
      );
      return latestUpdate >= last24HoursTimestamp;
    });

    // NEW: Get detailed info about discounted customers
    const discountedCustomerDetails: Array<{
      customerId: string;
      mrr: number;
      hasDiscount: boolean;
      subscriptionAge: number;
      price: number;
    }> = [];

    ourPaying.forEach((sub) => {
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const mrr = customerMRR[customerId] || 0;

      if (mrr < 149 && mrr > 0) {
        const item = sub.items?.data?.[0];
        const price = item?.price?.unit_amount ? item.price.unit_amount / 100 : 0;

        discountedCustomerDetails.push({
          customerId,
          mrr,
          hasDiscount: sub.discount !== null,
          subscriptionAge: Math.floor((now - sub.created) / 86400), // days
          price,
        });
      }
    });

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
      mrrAnalysis: {
        actualTotalMRR: Math.round(actualTotalMRR),
        expectedMRR: 48185,
        difference: Math.round(actualTotalMRR - 48185),
        zeroMrrSubscriptions: zeroMrrSubscriptions.length,
        customersWithZeroMRR: customersWithZeroMRR.length,
        customersByMRR: customersByMRR,
        totalUniquePayingCustomers: Object.keys(customerMRR).length,
        customersWithNonZeroMRR: Object.values(customerMRR).filter(mrr => mrr > 0).length,
      },
      couponAnalysis: {
        subscriptionsWithCoupons: subscriptionsWithCoupons.length,
        customersWithCoupons: customersWithCoupons.size,
        percentageWithCoupons: ((customersWithCoupons.size / uniquePayingCustomers.size) * 100).toFixed(1),
      },
      timeWindowAnalysis: {
        last4Weeks: {
          subscriptions: createdInLast4Weeks.length,
          uniqueCustomers: uniqueCustomersCreatedInLast4Weeks.size,
        },
        before4Weeks: {
          subscriptions: createdBefore4Weeks.length,
          uniqueCustomers: uniqueCustomersCreatedBefore4Weeks.size,
        },
        updatedInLast24Hours: updatedInLast24Hours.length,
      },
      discountedCustomers: {
        count: discountedCustomerDetails.length,
        details: discountedCustomerDetails.slice(0, 10), // First 10 for inspection
        summary: {
          withActiveDiscount: discountedCustomerDetails.filter(d => d.hasDiscount).length,
          withoutActiveDiscount: discountedCustomerDetails.filter(d => !d.hasDiscount).length,
          avgMRR: discountedCustomerDetails.length > 0
            ? (discountedCustomerDetails.reduce((sum, d) => sum + d.mrr, 0) / discountedCustomerDetails.length).toFixed(2)
            : 0,
        },
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Failed to fetch debug data" }, { status: 500 });
  }
}
