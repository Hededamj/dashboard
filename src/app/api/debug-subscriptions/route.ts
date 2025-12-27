import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    // Fetch all subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
    });

    let allSubs = subscriptions.data;
    let hasMore = subscriptions.has_more;
    let pageCount = 1;

    while (hasMore && pageCount < 50) {
      const nextPage = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        starting_after: allSubs[allSubs.length - 1].id,
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

    // Count active subscriptions with cancel_at_period_end
    const activeWithCancel = allSubs.filter(
      (sub) => sub.status === "active" && sub.cancel_at_period_end === true
    );

    // Count our filtered "active" subscriptions
    const ourActive = allSubs.filter(
      (sub) =>
        sub.status === "trialing" ||
        (sub.status === "active" && sub.cancel_at_period_end !== true)
    );

    const ourPaying = ourActive.filter((sub) => sub.status === "active");
    const ourTrials = ourActive.filter((sub) => sub.status === "trialing");

    return NextResponse.json({
      total: allSubs.length,
      statusBreakdown: statusCount,
      activeWithCancelAtPeriodEnd: activeWithCancel.length,
      ourCounts: {
        total: ourActive.length,
        paying: ourPaying.length,
        trials: ourTrials.length,
      },
      expectedStripe: {
        total: 329,
        trials: 53,
        paying: 276,
      },
      difference: {
        total: ourActive.length - 329,
        paying: ourPaying.length - 276,
        trials: ourTrials.length - 53,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Failed to fetch debug data" }, { status: 500 });
  }
}
