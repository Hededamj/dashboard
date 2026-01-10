"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, LayoutDashboard, Users, DollarSign } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isAnalytics = pathname?.includes("/analytics");
  const isInsights = pathname?.includes("/insights");
  const isCommercial = pathname?.includes("/commercial");

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", active: !isAnalytics && !isInsights && !isCommercial },
    { path: "/dashboard/analytics", icon: BarChart3, label: "Analytics", active: isAnalytics },
    { path: "/dashboard/insights", icon: Users, label: "Insights", active: isInsights },
    { path: "/dashboard/commercial", icon: DollarSign, label: "Commercial", active: isCommercial },
  ];

  const activeItem = navItems.find(item => item.active);

  const handleNavChange = (path: string) => {
    router.push(path);
  };

  return (
    <header className="border-b-2 border-border bg-card relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-transparent to-secondary" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-6 relative">
        {/* Mobile: Stacked layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full" />
              <img
                src="https://mettehummel.dk/wp-content/uploads/2022/01/61f90d613911e_1643711841_mette-logo-2021-hvid.png"
                alt="Mette Hummel Logo"
                className="h-10 md:h-14 w-auto relative z-10"
              />
            </div>
            <div className="border-l-2 border-primary/30 pl-3 sm:pl-6">
              <h1 className="text-lg md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2 sm:gap-3">
                <span className="hidden xs:inline">FamilyMind</span> Dashboard
                <span className="text-[8px] md:text-[10px] font-mono-data font-semibold bg-secondary/20 text-secondary border border-secondary/50 px-1.5 sm:px-2 py-0.5 sm:py-1">
                  v2.1
                </span>
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium hidden sm:block">
                Oversigt over medlemmer og økonomi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 justify-end">
            {session?.user?.email && (
              <div className="hidden md:block text-right border-r-2 border-border pr-6">
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
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-background border-2 border-border text-foreground font-semibold text-xs md:text-sm hover:border-primary hover:text-primary transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
            >
              <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2.5} />
              <span className="hidden xs:inline">Log ud</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation - Dropdown */}
        <div className="md:hidden border-t-2 border-border pt-4 -mb-4 pb-4">
          <div className="relative">
            <select
              value={pathname || "/dashboard"}
              onChange={(e) => handleNavChange(e.target.value)}
              className="w-full appearance-none bg-background border-2 border-border text-foreground font-bold uppercase tracking-wide px-4 py-3 pr-10 text-sm hover:border-primary focus:border-primary focus:outline-none transition-all duration-300"
            >
              {navItems.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Desktop Navigation - Horizontal Tabs */}
        <nav className="hidden md:flex gap-1 border-t-2 border-border pt-4 -mb-6 pb-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`
                relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide whitespace-nowrap
                transition-all duration-300
                ${item.active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-transparent hover:border-primary/20"
                }
              `}
            >
              <item.icon className="h-4 w-4" strokeWidth={2.5} />
              <span>{item.label}</span>
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
