import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  is2FAEnabled,
  isDeviceTrusted,
  createDeviceFingerprint,
} from "@/lib/2fa";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Check if 2FA is enabled for this user
    const enabled = await is2FAEnabled(email);

    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        needsVerification: false,
      });
    }

    // Check if current device is trusted
    const headersList = headers();
    const userAgent = headersList.get("user-agent") || "unknown";
    const ip = headersList.get("x-forwarded-for") || "unknown";

    const fingerprint = createDeviceFingerprint(userAgent, ip);
    const trusted = await isDeviceTrusted(email, fingerprint);

    return NextResponse.json({
      enabled: true,
      needsVerification: !trusted,
    });
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    return NextResponse.json(
      { error: "Failed to check 2FA status" },
      { status: 500 }
    );
  }
}
