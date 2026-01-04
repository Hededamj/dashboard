import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/metrics";
import { getAnalyticsMetrics } from "@/lib/metrics";
import { getGrowthTrends } from "@/lib/metrics";
import { getRecentActivity } from "@/lib/metrics";

/**
 * Vercel Cron Job - Refreshes all dashboard data every 30 minutes
 * This pre-populates the cache so pages load instantly for users
 */
export async function GET(request: Request) {
  try {
    // Verify this is actually a cron request (security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('[Cron] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting background data refresh...');
    const startTime = Date.now();

    // Refresh all data in parallel
    const results = await Promise.allSettled([
      // Dashboard metrics for different periods
      getDashboardMetrics('last4weeks'),
      getDashboardMetrics('last7days'),
      getDashboardMetrics('monthToDate'),
      getDashboardMetrics('last3months'),

      // Analytics
      getAnalyticsMetrics(),

      // Trends for different periods
      getGrowthTrends('last4weeks'),
      getGrowthTrends('last7days'),
      getGrowthTrends('monthToDate'),

      // Activity
      getRecentActivity(),
    ]);

    const duration = Date.now() - startTime;

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[Cron] Refresh complete in ${duration}ms - ${successful} successful, ${failed} failed`);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[Cron] Task ${index} failed:`, result.reason);
      }
    });

    return NextResponse.json({
      success: true,
      duration,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Fatal error during refresh:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
