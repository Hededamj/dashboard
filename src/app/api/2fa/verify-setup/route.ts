import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyTOTP, get2FAData, store2FAData } from "@/lib/2fa";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const email = session.user.email;
    const data = await get2FAData(email);

    if (!data) {
      return NextResponse.json(
        { error: "2FA setup not found. Please start setup again." },
        { status: 400 }
      );
    }

    // Verify the code
    const isValid = verifyTOTP(code, data.secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // Enable 2FA
    await store2FAData(email, {
      ...data,
      enabled: true,
    });

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch (error) {
    console.error("Error verifying 2FA setup:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
