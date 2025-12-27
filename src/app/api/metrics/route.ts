import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardMetrics, type PeriodType } from "@/lib/metrics";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") as PeriodType) || "last4weeks";

    // Get metrics from Stripe
    const metrics = await getDashboardMetrics(period);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
