"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Check, Copy, Download } from "lucide-react";

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"qr" | "verify" | "success">("qr");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchSetupData();
    }
  }, [status, router]);

  async function fetchSetupData() {
    try {
      const res = await fetch("/api/2fa/setup");

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to setup 2FA");
      }

      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid code");
      }

      setStep("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadBackupCodes() {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "familymind-backup-codes.txt";
    a.click();
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Indlæser 2FA setup...</p>
        </div>
      </div>
    );
  }

  if (error && !qrCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-600 mb-4">⚠️</div>
              <h2 className="text-xl font-semibold mb-2">Fejl</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Tilbage til dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Opsæt To-Faktor Authentication
          </h1>
          <p className="text-gray-600">
            Beskyt din konto med en ekstra sikkerhedslag
          </p>
        </div>

        {/* Step 1: QR Code */}
        {step === "qr" && (
          <Card>
            <CardHeader>
              <CardTitle>Trin 1: Scan QR koden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-4">
                  Scan denne QR kode med din authenticator app (Google
                  Authenticator, Authy, osv.)
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="max-w-xs" />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Kan ikke scanne QR koden?
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  Indtast denne kode manuelt i din app:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-blue-200 text-sm font-mono">
                    {secret}
                  </code>
                  <button
                    onClick={copySecret}
                    className="p-2 text-blue-600 hover:text-blue-700"
                    title="Kopier"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep("verify")}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Næste: Verificer kode
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Verify */}
        {step === "verify" && (
          <Card>
            <CardHeader>
              <CardTitle>Trin 2: Verificer din authenticator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indtast 6-cifret kode fra din authenticator app
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full px-4 py-3 text-2xl text-center tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("qr")}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Tilbage
                </button>
                <button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6 || verifying}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? "Verificerer..." : "Verificer"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success & Backup Codes */}
        {step === "success" && (
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">2FA Aktiveret!</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">
                  ⚠️ Vigtigt: Gem dine backup koder
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Hvis du mister adgang til din authenticator app, kan du bruge
                  disse backup koder til at komme ind. Gem dem et sikkert sted!
                </p>
                <div className="bg-white rounded border border-yellow-300 p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="text-gray-700">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={downloadBackupCodes}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download backup koder
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  ✓ Din konto er nu beskyttet med to-faktor authentication
                </p>
                <p className="text-sm text-green-700 mt-2">
                  ✓ Du skal indtaste en kode fra din app næste gang du logger
                  ind fra en ny enhed
                </p>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Gå til dashboard
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
