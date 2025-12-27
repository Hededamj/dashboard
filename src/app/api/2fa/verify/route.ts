import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  verifyTOTP,
  get2FAData,
  storeTrustedDevice,
  createDeviceFingerprint,
  type TrustedDevice,
} from "@/lib/2fa";
import { headers } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, trustDevice } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const email = session.user.email;
    const data = await get2FAData(email);

    if (!data || !data.enabled) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 }
      );
    }

    // Check if code is a backup code
    const isBackupCode = data.backupCodes.includes(code.toUpperCase());

    // Verify TOTP or backup code
    const isValid = isBackupCode || verifyTOTP(code, data.secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 }
      );
    }

    // If backup code was used, remove it
    if (isBackupCode) {
      const updatedBackupCodes = data.backupCodes.filter(
        (c) => c !== code.toUpperCase()
      );
      await store2FAData(email, {
        ...data,
        backupCodes: updatedBackupCodes,
      });
    }

    // If user wants to trust this device, save it
    if (trustDevice) {
      const headersList = headers();
      const userAgent = headersList.get("user-agent") || "unknown";
      const ip = headersList.get("x-forwarded-for") || "unknown";

      const fingerprint = createDeviceFingerprint(userAgent, ip);

      const device: TrustedDevice = {
        fingerprint,
        deviceName: userAgent.substring(0, 100),
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      };

      await storeTrustedDevice(email, device);
    }

    return NextResponse.json({
      success: true,
      message: "2FA verification successful",
    });
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 }
    );
  }
}
