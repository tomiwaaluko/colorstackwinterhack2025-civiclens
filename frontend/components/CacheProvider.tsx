"use client";

import { SWRConfig } from "swr";
import { useEffect } from "react";
import { swrConfig } from "@/lib/swr-config";
import { startKeepWarm } from "@/lib/keep-warm";
import { clearExpiredCache } from "@/lib/cache";

interface CacheProviderProps {
  children: React.ReactNode;
}

/**
 * CacheProvider - Wraps the app with SWR configuration and initializes caching services
 *
 * Features:
 * - SWR configuration for data fetching with stale-while-revalidate
 * - Backend keep-warm service to prevent Render free tier spin-down
 * - Automatic cleanup of expired localStorage cache
 */
export function CacheProvider({ children }: CacheProviderProps) {
  useEffect(() => {
    // Start the keep-warm service to prevent backend spin-down
    startKeepWarm();

    // Clean up expired cache entries on mount
    clearExpiredCache();

    // Set up periodic cache cleanup (every hour)
    const cleanupInterval = setInterval(clearExpiredCache, 60 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
