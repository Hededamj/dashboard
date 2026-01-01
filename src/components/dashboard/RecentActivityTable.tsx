"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityEvent } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { UserPlus, UserMinus } from "lucide-react";

interface RecentActivityTableProps {
  data: ActivityEvent[];
}

export function RecentActivityTable({ data }: RecentActivityTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Seneste Aktivitet</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dato</TableHead>
              <TableHead className="text-right">Aktive Perioder</TableHead>
              <TableHead className="text-right">Beløb</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Ingen aktivitet endnu
                </TableCell>
              </TableRow>
            ) : (
              data.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {event.type === "signup" ? (
                        <>
                          <UserPlus className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">Ny tilmelding</span>
                        </>
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-600">Opsigelse</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{event.email}</TableCell>
                  <TableCell>{formatDate(new Date(event.date))}</TableCell>
                  <TableCell className="text-right">
                    {event.activePeriods ? (
                      <span className="font-medium">
                        {event.activePeriods} {event.activePeriods === 1 ? "måned" : "måneder"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {event.amount ? formatCurrency(event.amount) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
