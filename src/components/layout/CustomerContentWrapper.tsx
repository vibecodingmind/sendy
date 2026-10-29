"use client";

import React from "react";
import { usePathname } from "next/navigation";

export function CustomerContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWebmail = pathname === "/webmail";

  if (isWebmail) {
    return (
      <main className="flex-1 p-1.5 sm:p-2.5 overflow-hidden flex flex-col w-full min-w-0">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto min-w-0">
      {children}
    </main>
  );
}
