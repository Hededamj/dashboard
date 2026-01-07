import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearCache } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get period from request body
    const body = await request.json();
    const period = body.period || "last4weeks";

    // Clear all dashboard-related caches
    const cachesToClear = [
      `dashboard-metrics-v4-${period}`,
      `trends-v4-${period}`,
      "recent-activity-v2",
      "analytics-metrics-v2",
    ];

    await Promise.all(cachesToClear.map((key) => clearCache(key)));

    console.log(`[Cache] Cleared dashboard cache for period: ${period}`);

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      clearedKeys: cachesToClear
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
