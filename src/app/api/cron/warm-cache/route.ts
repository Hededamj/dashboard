import { NextResponse } from "next/server";
import { getDashboardMetrics, getRecentActivity, getGrowthTrends } from "@/lib/metrics";

export const maxDuration = 60; // Allow up to 60 seconds for warming cache

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[Cron] CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron] Unauthorized attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting cache warming...");
    const startTime = Date.now();

    const results = {
      status: "warming",
      timestamp: new Date().toISOString(),
      results: [] as any[],
    };

    // Warm cache for all periods
    const periods = ["last4weeks", "last3months", "last12months"] as const;

    for (const period of periods) {
      try {
        console.log(`[Cron] Warming metrics for period: ${period}`);
        const metricStart = Date.now();
        await getDashboardMetrics(period);
        const metricTime = Date.now() - metricStart;

        results.results.push({
          type: "metrics",
          period,
          time: metricTime,
          status: "✅ success",
        });
        console.log(`[Cron] ✅ Metrics cached for ${period} in ${metricTime}ms`);
      } catch (error: any) {
        console.error(`[Cron] ❌ Failed to warm metrics for ${period}:`, error.message);
        results.results.push({
          type: "metrics",
          period,
          status: "❌ failed",
          error: error.message,
        });
      }

      try {
        console.log(`[Cron] Warming trends for period: ${period}`);
        const trendStart = Date.now();
        await getGrowthTrends(period);
        const trendTime = Date.now() - trendStart;

        results.results.push({
          type: "trends",
          period,
          time: trendTime,
          status: "✅ success",
        });
        console.log(`[Cron] ✅ Trends cached for ${period} in ${trendTime}ms`);
      } catch (error: any) {
        console.error(`[Cron] ❌ Failed to warm trends for ${period}:`, error.message);
        results.results.push({
          type: "trends",
          period,
          status: "❌ failed",
          error: error.message,
        });
      }
    }

    // Warm activity cache
    try {
      console.log(`[Cron] Warming activity data...`);
      const activityStart = Date.now();
      await getRecentActivity();
      const activityTime = Date.now() - activityStart;

      results.results.push({
        type: "activity",
        time: activityTime,
        status: "✅ success",
      });
      console.log(`[Cron] ✅ Activity cached in ${activityTime}ms`);
    } catch (error: any) {
      console.error(`[Cron] ❌ Failed to warm activity:`, error.message);
      results.results.push({
        type: "activity",
        status: "❌ failed",
        error: error.message,
      });
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.results.filter((r) => r.status.includes("success")).length;
    const failCount = results.results.filter((r) => r.status.includes("failed")).length;

    results.status = "completed";

    console.log(`[Cron] Cache warming completed in ${totalTime}ms`);
    console.log(`[Cron] Success: ${successCount}, Failed: ${failCount}`);

    return NextResponse.json({
      ...results,
      summary: {
        totalTime,
        successCount,
        failCount,
        message: failCount === 0
          ? "✅ All caches warmed successfully"
          : `⚠️ ${failCount} cache(s) failed to warm`,
      },
    });
  } catch (error: any) {
    console.error("[Cron] Error warming cache:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
