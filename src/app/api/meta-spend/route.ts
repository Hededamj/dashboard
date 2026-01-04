import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetaAdSpend } from "@/lib/meta";

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Meta ad spend data
    const spendData = await getMetaAdSpend();

    return NextResponse.json(spendData);
  } catch (error) {
    console.error("Error fetching Meta spend:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Meta spend data",
        fallback: true,
        totalSpend: 15000,
        dailySpend: 500,
        weeklySpend: 3500,
        monthlySpend: 15000,
        currency: "DKK"
      },
      { status: 200 } // Return 200 with fallback data instead of error
    );
  }
}
