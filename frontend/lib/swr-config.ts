/**
 * SWR Configuration and Hooks for CivicLens
 * Provides optimized data fetching with caching, deduplication, and error handling
 */

import useSWR, { SWRConfiguration, mutate } from "swr";
import {
  CACHE_CONFIG,
  getFromCache,
  saveToCache,
  generateCacheKey,
  CACHE_KEYS,
} from "./cache";
import type {
  SearchResult,
  PoliticianProfile,
  DonationsMapResponse,
  TimelineResponse,
  NetworkGraphResponse,
  RadialResponse,
  PoliticianSummaryResponse,
  EventType,
} from "./types";

// Base SWR configuration for all hooks
export const swrConfig: SWRConfiguration = {
  dedupingInterval: CACHE_CONFIG.SWR_DEDUPE_INTERVAL,
  revalidateOnFocus: CACHE_CONFIG.SWR_REVALIDATE_ON_FOCUS,
  revalidateOnReconnect: CACHE_CONFIG.SWR_REVALIDATE_ON_RECONNECT,
  errorRetryCount: CACHE_CONFIG.SWR_RETRY_COUNT,
  errorRetryInterval: CACHE_CONFIG.SWR_RETRY_DELAY,
  shouldRetryOnError: true,
  // Use stale data while revalidating
  revalidateIfStale: true,
  // Keep previous data while loading new data
  keepPreviousData: true,
};

// Type for fetcher function
type Fetcher<T> = (...args: unknown[]) => Promise<T>;

/**
 * Create a cached fetcher that checks localStorage before making API calls
 */
function createCachedFetcher<T>(
  fetcher: Fetcher<T>,
  cacheKeyPrefix: string,
  cacheDuration: number
): Fetcher<T> {
  return async (...args: unknown[]) => {
    const cacheKey = generateCacheKey(cacheKeyPrefix, { args });

    // Check localStorage cache first
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      // Return cached data, SWR will revalidate in background if needed
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher(...args);

    // Save to localStorage cache
    saveToCache(cacheKey, data, cacheDuration);

    return data;
  };
}

/**
 * Hook for searching politicians with caching
 */
export function useSearchPoliticians(name?: string, state?: string) {
  const key = name || state ? ["search", name, state] : null;

  return useSWR<SearchResult>(
    key,
    async () => {
      const { searchPoliticians } = await import("./api");
      return searchPoliticians(name, state);
    },
    {
      ...swrConfig,
      revalidateOnMount: true,
      // Keep search results fresh for 30 minutes
      dedupingInterval: CACHE_CONFIG.SEARCH_RESULTS,
    }
  );
}

/**
 * Hook for getting all politicians with aggressive caching
 * (Politicians list is relatively static)
 */
export function useAllPoliticians() {
  return useSWR<SearchResult>(
    "all-politicians",
    async () => {
      // Check localStorage first
      const cached = getFromCache<SearchResult>(CACHE_KEYS.POLITICIANS_LIST);
      if (cached) return cached;

      const { searchPoliticians } = await import("./api");
      const data = await searchPoliticians();

      // Cache for 24 hours
      saveToCache(
        CACHE_KEYS.POLITICIANS_LIST,
        data,
        CACHE_CONFIG.POLITICIANS_LIST
      );

      return data;
    },
    {
      ...swrConfig,
      // Politicians list is static, rarely changes
      revalidateOnMount: false,
      revalidateIfStale: false,
      dedupingInterval: CACHE_CONFIG.POLITICIANS_LIST,
    }
  );
}

/**
 * Hook for getting politician profile with caching
 */
export function usePoliticianProfile(id: string | number | null) {
  const stringId = id?.toString();

  return useSWR<PoliticianProfile>(
    stringId ? ["profile", stringId] : null,
    async () => {
      const cacheKey = `${CACHE_KEYS.POLITICIAN_PROFILE}${stringId}`;
      const cached = getFromCache<PoliticianProfile>(cacheKey);
      if (cached) return cached;

      const { getPoliticianProfile } = await import("./api");
      const data = await getPoliticianProfile(stringId!);

      saveToCache(cacheKey, data, CACHE_CONFIG.POLITICIAN_PROFILE);

      return data;
    },
    swrConfig
  );
}

/**
 * Hook for getting politician summary with caching
 */
export function usePoliticianSummary(id: string | number | null) {
  const stringId = id?.toString();

  return useSWR<PoliticianSummaryResponse>(
    stringId ? ["summary", stringId] : null,
    async () => {
      const { getPoliticianSummary } = await import("./api");
      return getPoliticianSummary(stringId!);
    },
    swrConfig
  );
}

/**
 * Hook for donations map with caching
 */
export function useDonationsMap(params?: {
  politician_ids?: number[];
  category?: string;
  start_date?: string;
  end_date?: string;
}) {
  const key = params
    ? ["donations-map", JSON.stringify(params)]
    : ["donations-map"];

  return useSWR<DonationsMapResponse>(
    key,
    async () => {
      const cacheKey = generateCacheKey(CACHE_KEYS.DONATIONS_MAP, params || {});
      const cached = getFromCache<DonationsMapResponse>(cacheKey);
      if (cached) return cached;

      const { getDonationsMap } = await import("./api");
      const data = await getDonationsMap(params);

      saveToCache(cacheKey, data, CACHE_CONFIG.DONATIONS_MAP);

      return data;
    },
    {
      ...swrConfig,
      dedupingInterval: CACHE_CONFIG.DONATIONS_MAP,
    }
  );
}

/**
 * Hook for timeline data with caching
 */
export function useTimeline(
  politicianId: string | number,
  params?: {
    start_date?: string;
    end_date?: string;
    event_types?: EventType[];
  }
) {
  const key = ["timeline", politicianId, JSON.stringify(params || {})];

  return useSWR<TimelineResponse>(
    key,
    async () => {
      const cacheKey = generateCacheKey(CACHE_KEYS.TIMELINE, {
        politicianId,
        ...params,
      });
      const cached = getFromCache<TimelineResponse>(cacheKey);
      if (cached) return cached;

      const { getPoliticianTimeline } = await import("./api");
      const data = await getPoliticianTimeline(politicianId, params);

      saveToCache(cacheKey, data, CACHE_CONFIG.TIMELINE);

      return data;
    },
    swrConfig
  );
}

/**
 * Hook for network graph with caching
 */
export function useNetworkGraph(params?: {
  politician_ids?: number[];
  depth?: number;
  include_donors?: boolean;
  include_bills?: boolean;
  min_connection_strength?: number;
}) {
  const key = params ? ["network", JSON.stringify(params)] : ["network"];

  return useSWR<NetworkGraphResponse>(
    key,
    async () => {
      const cacheKey = generateCacheKey(CACHE_KEYS.NETWORK, params || {});
      const cached = getFromCache<NetworkGraphResponse>(cacheKey);
      if (cached) return cached;

      const { getNetworkGraph } = await import("./api");
      const data = await getNetworkGraph(params);

      saveToCache(cacheKey, data, CACHE_CONFIG.NETWORK_GRAPH);

      return data;
    },
    {
      ...swrConfig,
      dedupingInterval: CACHE_CONFIG.NETWORK_GRAPH,
    }
  );
}

/**
 * Hook for radial chart data with caching
 */
export function useRadialChart(
  politicianId: string | number,
  params?: {
    start_date?: string;
    end_date?: string;
  }
) {
  const key = ["radial", politicianId, JSON.stringify(params || {})];

  return useSWR<RadialResponse>(
    key,
    async () => {
      const cacheKey = generateCacheKey(CACHE_KEYS.RADIAL, {
        politicianId,
        ...params,
      });
      const cached = getFromCache<RadialResponse>(cacheKey);
      if (cached) return cached;

      const { getPoliticianRadial } = await import("./api");
      const data = await getPoliticianRadial(politicianId, params);

      saveToCache(cacheKey, data, CACHE_CONFIG.RADIAL_CHART);

      return data;
    },
    swrConfig
  );
}

/**
 * Prefetch data for a politician (useful for hover/preloading)
 */
export async function prefetchPolitician(id: string | number): Promise<void> {
  const stringId = id.toString();
  const key = ["profile", stringId];

  // Check if already cached
  const cacheKey = `${CACHE_KEYS.POLITICIAN_PROFILE}${stringId}`;
  if (getFromCache(cacheKey)) return;

  // Prefetch in background and await the result
  await mutate(
    key,
    async () => {
      const { getPoliticianProfile } = await import("./api");
      const data = await getPoliticianProfile(stringId);
      saveToCache(cacheKey, data, CACHE_CONFIG.POLITICIAN_PROFILE);
      return data;
    },
    { revalidate: false }
  );
}

/**
 * Invalidate all cached data (useful for refresh)
 */
export function invalidateAllCache(): void {
  // Clear SWR cache
  mutate(() => true, undefined, { revalidate: true });

  // Clear localStorage cache
  import("./cache").then(({ clearAllCache }) => clearAllCache());
}

/**
 * Invalidate cache for a specific politician
 */
export function invalidatePoliticianCache(id: string | number): void {
  const stringId = String(id);
  mutate(["profile", stringId]);
  mutate(["summary", stringId]);

  // Clear from localStorage
  import("./cache").then(({ clearCacheEntry, CACHE_KEYS }) => {
    clearCacheEntry(`${CACHE_KEYS.POLITICIAN_PROFILE}${stringId}`);
  });
}
