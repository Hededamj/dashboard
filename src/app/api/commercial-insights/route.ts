import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { withCache } from "@/lib/cache";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";

export async function GET() {
  try {
    console.log("[Commercial Insights] Starting analysis...");

    // Fetch balance and payouts (cached for 5 minutes)
    const payoutData = await withCache("commercial-payouts-v1", async () => {
      const balance = await stripe.balance.retrieve();
      const payouts = await stripe.payouts.list({
        limit: 10,
      });

      return {
        availableBalance: (balance.available[0]?.amount || 0) / 100,
        pendingBalance: (balance.pending[0]?.amount || 0) / 100,
        currency: balance.available[0]?.currency || "dkk",
        upcomingPayouts: payouts.data.map((payout) => ({
          id: payout.id,
          amount: payout.amount / 100,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
          status: payout.status,
          type: payout.type,
        })),
      };
    }, 300); // 5 minutes

    // Fetch subscription revenue data (cached for 10 minutes)
    const revenueData = await withCache("commercial-revenue-v1", async () => {
      // Get active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        status: "active",
        limit: 100,
        expand: ["data.items.data.price"],
      });

      let allActiveSubs = subscriptions.data;
      let hasMore = subscriptions.has_more;
      let pageCount = 1;

      // Fetch up to 10 pages (1000 subscriptions)
      while (hasMore && pageCount < 10) {
        const nextPage = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
          starting_after: allActiveSubs[allActiveSubs.length - 1].id,
          expand: ["data.items.data.price"],
        });

        allActiveSubs = [...allActiveSubs, ...nextPage.data];
        hasMore = nextPage.has_more;
        pageCount++;
      }

      // Filter live mode only
      const liveSubs = allActiveSubs.filter((sub) => sub.livemode === true);

      // Calculate MRR and breakdown
      let totalMRR = 0;
      let monthlyRevenue = 0;
      let halfYearRevenue = 0;
      let yearlyRevenue = 0;

      const revenueByInterval: Record<string, number> = {
        month: 0,
        year: 0,
      };

      liveSubs.forEach((sub) => {
        sub.items.data.forEach((item) => {
          const price = item.price;
          const amount = (price.unit_amount || 0) / 100;
          const interval = price.recurring?.interval || "month";

          if (interval === "month") {
            monthlyRevenue += amount * item.quantity;
            totalMRR += amount * item.quantity;
            revenueByInterval.month += amount * item.quantity;
          } else if (interval === "year") {
            yearlyRevenue += amount * item.quantity;
            totalMRR += (amount * item.quantity) / 12;
            revenueByInterval.year += amount * item.quantity;
          }
        });
      });

      // Count subscriptions by interval
      const subsByInterval: Record<string, number> = {
        month: 0,
        year: 0,
      };

      liveSubs.forEach((sub) => {
        sub.items.data.forEach((item) => {
          const interval = item.price.recurring?.interval || "month";
          subsByInterval[interval] = (subsByInterval[interval] || 0) + 1;
        });
      });

      // Calculate projected revenue for next month
      const projectedNextMonth = totalMRR;

      return {
        currentMRR: Math.round(totalMRR),
        projectedNextMonth: Math.round(projectedNextMonth),
        monthlyRevenue: Math.round(monthlyRevenue),
        yearlyRevenue: Math.round(yearlyRevenue),
        revenueByInterval,
        subscriptionsByInterval: subsByInterval,
        totalActiveSubscriptions: liveSubs.length,
      };
    }, 600); // 10 minutes

    // Fetch recent transactions (cached for 5 minutes)
    const transactionData = await withCache("commercial-transactions-v1", async () => {
      const charges = await stripe.charges.list({
        limit: 100,
      });

      // Group by month for trend
      const revenueByMonth: Record<string, number> = {};

      charges.data
        .filter((charge) => charge.paid && charge.livemode)
        .forEach((charge) => {
          const month = format(new Date(charge.created * 1000), "MMM yyyy");
          revenueByMonth[month] = (revenueByMonth[month] || 0) + charge.amount / 100;
        });

      return {
        recentCharges: charges.data.slice(0, 5).map((charge) => ({
          id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency,
          created: new Date(charge.created * 1000).toISOString(),
          status: charge.status,
        })),
        revenueByMonth,
      };
    }, 300); // 5 minutes

    console.log("[Commercial Insights] Analysis complete");

    return NextResponse.json({
      payouts: payoutData,
      revenue: revenueData,
      transactions: transactionData,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Commercial Insights] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch commercial insights" },
      { status: 500 }
    );
  }
}
