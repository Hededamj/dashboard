"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone } from "lucide-react";

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [verificationCode, setVerificationCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verificationCode,
          trustDevice,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid code");
      }

      // Verification successful, redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
      setVerificationCode("");
    } finally {
      setVerifying(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Indlæser...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Shield className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            To-Faktor Verificering
          </h1>
          <p className="text-gray-600">
            Indtast koden fra din authenticator app
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5" />
              Verificer din identitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-cifret kode
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
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Husk denne enhed
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Du behøver ikke indtaste kode igen på denne enhed i 30
                      dage
                    </div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={verificationCode.length !== 6 || verifying}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {verifying ? "Verificerer..." : "Verificer"}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Har du problemer med at få adgang?
                </p>
                <p className="text-xs text-gray-500">
                  Brug en af dine backup koder i stedet
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Tilbage til login
          </button>
        </div>
      </div>
    </div>
  );
}
