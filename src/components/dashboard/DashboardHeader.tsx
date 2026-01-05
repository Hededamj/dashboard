"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, LayoutDashboard, Users, Bot, DollarSign } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isAnalytics = pathname?.includes("/analytics");
  const isInsights = pathname?.includes("/insights");
  const isCommercial = pathname?.includes("/commercial");
  const isChat = pathname?.includes("/chat");

  return (
    <header className="border-b-2 border-border bg-card relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-secondary" />
      </div>

      <div className="container mx-auto px-6 py-6 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full" />
              <img
                src="https://mettehummel.dk/wp-content/uploads/2022/01/61f90d613911e_1643711841_mette-logo-2021-hvid.png"
                alt="Mette Hummel Logo"
                className="h-14 w-auto relative z-10"
              />
            </div>
            <div className="border-l-2 border-primary/30 pl-6">
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                FamilyMind Dashboard
                <span className="text-[10px] font-mono-data font-semibold bg-secondary/20 text-secondary border border-secondary/50 px-2 py-1">
                  v2.1
                </span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                Oversigt over medlemmer og økonomi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {session?.user?.email && (
              <div className="text-right border-r-2 border-border pr-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Logged in
                </p>
                <p className="text-sm font-mono-data font-medium text-foreground">
                  {session.user.email}
                </p>
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 px-4 py-2.5 bg-background border-2 border-border text-foreground font-semibold text-sm hover:border-primary hover:text-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
              Log ud
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Brutalist style */}
        <nav className="flex gap-1 border-t-2 border-border pt-4 -mb-6 pb-6">
          {[
            { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", active: !isAnalytics && !isInsights && !isCommercial && !isChat },
            { path: "/dashboard/analytics", icon: BarChart3, label: "Analytics", active: isAnalytics },
            { path: "/dashboard/insights", icon: Users, label: "Insights", active: isInsights },
            { path: "/dashboard/commercial", icon: DollarSign, label: "Commercial", active: isCommercial },
            { path: "/dashboard/chat", icon: Bot, label: "MyMind", active: isChat },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide
                transition-all duration-300
                ${item.active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-transparent hover:border-primary/20"
                }
              `}
            >
              <item.icon className="h-4 w-4" strokeWidth={2.5} />
              {item.label}
              {item.active && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
