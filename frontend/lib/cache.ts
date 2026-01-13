/**
 * Cache utilities for CivicLens
 * Implements localStorage caching for static data and cache management
 */

// Cache configuration
export const CACHE_CONFIG = {
  // Cache durations (in milliseconds)
  POLITICIANS_LIST: 24 * 60 * 60 * 1000, // 24 hours - static data
  POLITICIAN_PROFILE: 60 * 60 * 1000, // 1 hour
  SEARCH_RESULTS: 30 * 60 * 1000, // 30 minutes
  DONATIONS_MAP: 60 * 60 * 1000, // 1 hour
  TIMELINE: 30 * 60 * 1000, // 30 minutes
  NETWORK_GRAPH: 60 * 60 * 1000, // 1 hour
  RADIAL_CHART: 60 * 60 * 1000, // 1 hour

  // SWR configuration
  SWR_DEDUPE_INTERVAL: 60 * 1000, // 1 minute - dedupe identical requests
  SWR_REVALIDATE_ON_FOCUS: false, // Don't revalidate when window gets focus
  SWR_REVALIDATE_ON_RECONNECT: true, // Revalidate when reconnecting
  SWR_RETRY_COUNT: 3, // Retry failed requests 3 times
  SWR_RETRY_DELAY: 1000, // 1 second between retries
};

// Cache key prefixes
export const CACHE_KEYS = {
  POLITICIANS_LIST: "civiclens:politicians",
  POLITICIAN_PROFILE: "civiclens:profile:",
  SEARCH: "civiclens:search:",
  DONATIONS_MAP: "civiclens:donations:",
  TIMELINE: "civiclens:timeline:",
  NETWORK: "civiclens:network:",
  RADIAL: "civiclens:radial:",
  LAST_BACKEND_PING: "civiclens:lastPing",
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get data from localStorage cache
 */
export function getFromCache<T>(key: string): T | null {
  if (!isBrowser()) return null;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now > entry.expiry) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.warn("Cache read error:", error);
    return null;
  }
}

/**
 * Save data to localStorage cache
 */
export function saveToCache<T>(key: string, data: T, duration: number): void {
  if (!isBrowser()) return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // Handle quota exceeded or other storage errors
    console.warn("Cache write error:", error);
    // Try to clear old cache entries if storage is full
    clearExpiredCache();
  }
}

/**
 * Clear a specific cache entry
 */
export function clearCacheEntry(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache(): void {
  if (!isBrowser()) return;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("civiclens:")) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          if (entry.expiry && now > entry.expiry) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Invalid cache entry, remove it
        keysToRemove.push(key!);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear all CivicLens cache entries
 */
export function clearAllCache(): void {
  if (!isBrowser()) return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("civiclens:")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; totalSize: number } {
  if (!isBrowser()) return { entries: 0, totalSize: 0 };

  let entries = 0;
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("civiclens:")) {
      entries++;
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16 encoding
      }
    }
  }

  return { entries, totalSize };
}

/**
 * Generate a cache key from parameters
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join("&");

  return `${prefix}${sortedParams}`;
}
