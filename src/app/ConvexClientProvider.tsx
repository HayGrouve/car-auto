"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode } from "react";
import { env } from "@/env";

/**
 * Convex client provider component
 * 
 * Wraps the application with Convex React client for database access.
 * The Convex URL is validated via environment variables.
 */
const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
