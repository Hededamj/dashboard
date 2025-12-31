import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { withCache } from "@/lib/cache";
import { calculateMRR } from "@/lib/metrics";
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

    // Fetch subscription revenue data (using same MRR calc as dashboard)
    const revenueData = await withCache("commercial-revenue-v2", async () => {
      // Use same MRR calculation as dashboard for consistency
      const currentMRR = await calculateMRR();

      // Get active subscriptions for breakdown analysis
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

      // Calculate revenue breakdown (for charts)
      let monthlyRevenue = 0;
      let yearlyRevenue = 0;

      const revenueByInterval: Record<string, number> = {
        month: 0,
        year: 0,
      };

      const subsByInterval: Record<string, number> = {
        month: 0,
        year: 0,
      };

      liveSubs.forEach((sub) => {
        sub.items.data.forEach((item) => {
          const price = item.price;
          const amount = (price.unit_amount || 0) / 100;
          const quantity = item.quantity || 1;
          const interval = price.recurring?.interval || "month";

          if (interval === "month") {
            monthlyRevenue += amount * quantity;
            revenueByInterval.month += amount * quantity;
            subsByInterval.month += 1;
          } else if (interval === "year") {
            yearlyRevenue += amount * quantity;
            revenueByInterval.year += amount * quantity;
            subsByInterval.year += 1;
          }
        });
      });

      // Calculate YTD metrics
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const monthsElapsed = Math.max(1, now.getMonth() + 1); // At least 1 month

      return {
        currentMRR: Math.round(currentMRR),
        projectedNextMonth: Math.round(currentMRR), // Same as current MRR
        monthlyRevenue: Math.round(monthlyRevenue),
        yearlyRevenue: Math.round(yearlyRevenue),
        revenueByInterval,
        subscriptionsByInterval: subsByInterval,
        totalActiveSubscriptions: liveSubs.length,
        monthsElapsed,
      };
    }, 600); // 10 minutes

    // Fetch YTD revenue and projections (cached for 10 minutes)
    const transactionData = await withCache("commercial-transactions-v2", async () => {
      // Get YTD charges
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const startOfYearTimestamp = Math.floor(startOfYear.getTime() / 1000);

      const ytdCharges = await stripe.charges.list({
        created: { gte: startOfYearTimestamp },
        limit: 100,
      });

      // Fetch all YTD charges (up to 1000)
      let allCharges = ytdCharges.data;
      let hasMore = ytdCharges.has_more;
      let pageCount = 1;

      while (hasMore && pageCount < 10) {
        const nextPage = await stripe.charges.list({
          created: { gte: startOfYearTimestamp },
          limit: 100,
          starting_after: allCharges[allCharges.length - 1].id,
        });
        allCharges = [...allCharges, ...nextPage.data];
        hasMore = nextPage.has_more;
        pageCount++;
      }

      // Calculate YTD revenue
      const ytdRevenue = allCharges
        .filter((charge) => charge.paid && charge.livemode)
        .reduce((sum, charge) => sum + charge.amount / 100, 0);

      const monthsElapsed = Math.max(1, now.getMonth() + 1);
      const avgRevenuePerMonthYTD = ytdRevenue / monthsElapsed;

      // Group by month for trend analysis
      const revenueByMonth: Record<string, number> = {};
      allCharges
        .filter((charge) => charge.paid && charge.livemode)
        .forEach((charge) => {
          const month = format(new Date(charge.created * 1000), "MMM yyyy");
          revenueByMonth[month] = (revenueByMonth[month] || 0) + charge.amount / 100;
        });

      // Calculate growth trend (simple linear regression)
      const monthlyValues = Object.entries(revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, value]) => value);

      let growthRate = 0;
      if (monthlyValues.length >= 2) {
        const firstMonth = monthlyValues[0] || 0;
        const lastMonth = monthlyValues[monthlyValues.length - 1] || 0;
        growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
      }

      // Project 12 months forward based on current MRR and growth
      const currentMRR = await calculateMRR();
      const monthlyGrowthRate = growthRate / monthlyValues.length; // Average monthly growth
      const projectedRevenue12Months = currentMRR * 12 * (1 + monthlyGrowthRate / 100);

      return {
        ytdRevenue: Math.round(ytdRevenue),
        avgRevenuePerMonthYTD: Math.round(avgRevenuePerMonthYTD),
        projectedRevenue12Months: Math.round(projectedRevenue12Months),
        growthRate: Math.round(growthRate * 10) / 10,
        revenueByMonth,
      };
    }, 600); // 10 minutes

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
