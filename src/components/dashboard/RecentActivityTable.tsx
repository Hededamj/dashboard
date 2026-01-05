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
      <div className="border-b-2 border-border p-6 bg-background/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Activity Feed
            </h3>
            <h2 className="text-xl font-bold text-foreground">Seneste Aktivitet</h2>
          </div>
          <div className="w-10 h-10 rounded bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
            <Activity className="h-5 w-5 text-accent" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b-2 border-border bg-background/30">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dato
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Aktive Perioder
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Beløb
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {event.type === "signup" ? (
                        <>
                          <div className="w-8 h-8 rounded bg-secondary/10 border border-secondary/30 flex items-center justify-center">
                            <UserPlus className="h-4 w-4 text-secondary" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-secondary text-sm">Ny tilmelding</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded bg-accent/10 border border-accent/30 flex items-center justify-center">
                            <UserMinus className="h-4 w-4 text-accent" strokeWidth={2.5} />
                          </div>
                          <span className="font-semibold text-accent text-sm">Opsigelse</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono-data text-sm text-foreground">{event.email}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(new Date(event.date))}</td>
                  <td className="px-6 py-4 text-right">
                    {event.activePeriods ? (
                      <span className="font-mono-data font-semibold text-sm text-foreground">
                        {event.activePeriods} {event.activePeriods === 1 ? "måned" : "måneder"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono-data font-bold text-sm text-foreground">
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
