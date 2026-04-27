"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : undefined;
  return <SessionProvider baseUrl={baseUrl}>{children}</SessionProvider>;
}
