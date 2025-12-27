import { kv } from "@vercel/kv";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "FamilyMind Dashboard";

export interface User2FAData {
  secret: string;
  enabled: boolean;
  backupCodes: string[];
}

export interface TrustedDevice {
  fingerprint: string;
  deviceName: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a new TOTP secret for a user
 */
export function generateSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate QR code URL for authenticator apps
 */
export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, APP_NAME, secret);
  return await QRCode.toDataURL(otpauth);
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Create device fingerprint from request headers
 */
export function createDeviceFingerprint(userAgent: string, ip: string): string {
  const data = `${userAgent}-${ip}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * KV Storage helpers
 */

// Store user 2FA data
export async function store2FAData(email: string, data: User2FAData): Promise<void> {
  await kv.set(`2fa:${email}`, data);
}

// Get user 2FA data
export async function get2FAData(email: string): Promise<User2FAData | null> {
  return await kv.get<User2FAData>(`2fa:${email}`);
}

// Check if user has 2FA enabled
export async function is2FAEnabled(email: string): Promise<boolean> {
  const data = await get2FAData(email);
  return data?.enabled || false;
}

// Store trusted device
export async function storeTrustedDevice(
  email: string,
  device: TrustedDevice
): Promise<void> {
  const key = `trusted-devices:${email}`;
  const devices = (await kv.get<TrustedDevice[]>(key)) || [];

  // Remove expired devices
  const now = Date.now();
  const validDevices = devices.filter((d) => d.expiresAt > now);

  // Add new device
  validDevices.push(device);

  await kv.set(key, validDevices);
}

// Check if device is trusted
export async function isDeviceTrusted(
  email: string,
  fingerprint: string
): Promise<boolean> {
  const key = `trusted-devices:${email}`;
  const devices = (await kv.get<TrustedDevice[]>(key)) || [];

  const now = Date.now();
  return devices.some(
    (d) => d.fingerprint === fingerprint && d.expiresAt > now
  );
}

// Get all trusted devices for a user
export async function getTrustedDevices(email: string): Promise<TrustedDevice[]> {
  const key = `trusted-devices:${email}`;
  const devices = (await kv.get<TrustedDevice[]>(key)) || [];

  // Filter out expired devices
  const now = Date.now();
  return devices.filter((d) => d.expiresAt > now);
}

// Remove a trusted device
export async function removeTrustedDevice(
  email: string,
  fingerprint: string
): Promise<void> {
  const key = `trusted-devices:${email}`;
  const devices = (await kv.get<TrustedDevice[]>(key)) || [];

  const updatedDevices = devices.filter((d) => d.fingerprint !== fingerprint);
  await kv.set(key, updatedDevices);
}

// Disable 2FA for a user
export async function disable2FA(email: string): Promise<void> {
  await kv.del(`2fa:${email}`);
  await kv.del(`trusted-devices:${email}`);
}
