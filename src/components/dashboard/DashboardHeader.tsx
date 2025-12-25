"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              FamilyMind Dashboard
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
      </div>
    </header>
  );
}
