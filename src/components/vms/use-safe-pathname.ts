"use client";

import { usePathname } from "next/navigation";

/**
 * Resolves active pathname, preferring an explicit prop if provided.
 */
export function useSafePathname(propPath?: string): string {
  const pathname = usePathname();
  return propPath || pathname || "";
}

