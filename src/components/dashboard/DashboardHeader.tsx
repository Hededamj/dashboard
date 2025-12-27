"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, LayoutDashboard } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isAnalytics = pathname?.includes("/analytics");

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              FamilyMind Dashboard <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">v2.1</span>
            </h1>
            <p className="text-sm text-gray-500">
              Oversigt over medlemmer og økonomi
            </p>
          </div>

          <div className="flex items-center gap-4">
            {session?.user?.email && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user.email}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log ud
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 border-b -mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !isAnalytics
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => router.push("/dashboard/analytics")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isAnalytics
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
        </nav>
      </div>
    </header>
  );
}
