"use client";

import type { ActivityEvent } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { UserPlus, UserMinus, Activity } from "lucide-react";

interface RecentActivityTableProps {
  data: ActivityEvent[];
}

export function RecentActivityTable({ data }: RecentActivityTableProps) {
  return (
    <div className="relative overflow-hidden bg-card border-2 border-border hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/20 group">
      {/* Header */}
      <div className="border-b-2 border-border p-4 sm:p-6 bg-background/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Activity Feed
            </h3>
            <h2 className="text-base sm:text-xl font-bold text-foreground">Seneste Aktivitet</h2>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors flex-shrink-0">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-accent" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-2 border-border bg-background/30">
            <tr>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dato
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Aktive Perioder
              </th>
              <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Beløb
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-muted-foreground text-xs sm:text-sm">
                  Ingen aktivitet endnu
                </td>
              </tr>
            ) : (
              data.map((event, idx) => (
                <tr
                  key={event.id}
                  className="hover:bg-muted/20 transition-colors duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {event.type === "signup" ? (
                        <>
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-secondary/10 border border-secondary/30 flex items-center justify-center flex-shrink-0">
                            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 text-secondary" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-secondary text-xs sm:text-sm whitespace-nowrap">Ny tilmelding</span>
                        </>
                      ) : (
                        <>
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
                            <UserMinus className="h-3 w-3 sm:h-4 sm:w-4 text-accent" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-accent text-xs sm:text-sm whitespace-nowrap">Opsigelse</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono-data text-xs sm:text-sm text-foreground">{event.email}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{formatDate(new Date(event.date))}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    {event.activePeriods ? (
                      <span className="font-mono-data font-semibold text-xs sm:text-sm text-foreground whitespace-nowrap">
                        {event.activePeriods} {event.activePeriods === 1 ? "måned" : "måneder"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right font-mono-data font-bold text-xs sm:text-sm text-foreground whitespace-nowrap">
                    {event.amount ? formatCurrency(event.amount) : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}
