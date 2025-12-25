import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    // Test Stripe connection by fetching account info
    const balance = await stripe.balance.retrieve();

    return NextResponse.json({
      success: true,
      message: "Stripe connection successful!",
      data: {
        available: balance.available,
        pending: balance.pending,
        currency: balance.available[0]?.currency || "N/A",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Stripe connection failed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
