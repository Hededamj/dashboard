import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateSecret,
  generateQRCode,
  generateBackupCodes,
  store2FAData,
  get2FAData,
} from "@/lib/2fa";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    // Check if 2FA is already enabled
    const existing2FA = await get2FAData(email);
    if (existing2FA?.enabled) {
      return NextResponse.json(
        { error: "2FA is already enabled" },
        { status: 400 }
      );
    }

    // Generate new secret
    const secret = generateSecret();
    const qrCode = await generateQRCode(email, secret);
    const backupCodes = generateBackupCodes();

    // Store secret (but don't enable yet - user needs to verify first)
    await store2FAData(email, {
      secret,
      enabled: false,
      backupCodes,
    });

    return NextResponse.json({
      qrCode,
      secret,
      backupCodes,
    });
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    return NextResponse.json(
      { error: "Failed to setup 2FA" },
      { status: 500 }
    );
  }
}
