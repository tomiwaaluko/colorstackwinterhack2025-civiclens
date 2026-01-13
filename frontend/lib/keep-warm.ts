/**
 * Backend Keep-Warm Service
 * Prevents Render free tier from spinning down by pinging the backend periodically
 */

import { CACHE_KEYS, getFromCache, saveToCache } from "./cache";

// Configuration
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes (Render spins down after 15 min)
const HEALTH_ENDPOINT = "/health";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let pingIntervalId: NodeJS.Timeout | null = null;
let isInitialized = false;

/**
 * Ping the backend health endpoint
 */
async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${API_BASE_URL}${HEALTH_ENDPOINT}`, {
      method: "GET",
      signal: controller.signal,
      // Don't include credentials to avoid CORS issues
      mode: "cors",
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("[Keep-Warm] Backend ping successful");
      saveToCache(
        CACHE_KEYS.LAST_BACKEND_PING,
        Date.now(),
        24 * 60 * 60 * 1000
      );
      return true;
    }

    console.warn(
      "[Keep-Warm] Backend returned non-OK status:",
      response.status
    );
    return false;
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.warn("[Keep-Warm] Backend ping failed:", error);
    }
    return false;
  }
}

/**
 * Check if we should skip the ping (e.g., if running locally)
 */
function shouldSkipPing(): boolean {
  // Skip if we're in demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return true;
  }

  // Skip if backend is localhost (local development)
  if (
    API_BASE_URL.includes("localhost") ||
    API_BASE_URL.includes("127.0.0.1")
  ) {
    return true;
  }

  return false;
}

/**
 * Start the keep-warm service
 * Should be called once when the app initializes
 */
export function startKeepWarm(): void {
  // Only run in browser
  if (typeof window === "undefined") return;

  // Don't initialize twice
  if (isInitialized) return;
  isInitialized = true;

  // Skip if not needed
  if (shouldSkipPing()) {
    console.log("[Keep-Warm] Skipping - running locally or in demo mode");
    return;
  }

  console.log("[Keep-Warm] Starting backend keep-warm service");

  // Ping immediately on start
  pingBackend();

  // Then ping every PING_INTERVAL
  pingIntervalId = setInterval(pingBackend, PING_INTERVAL);

  // Also ping when the page becomes visible (user returns to tab)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const lastPing = getFromCache<number>(CACHE_KEYS.LAST_BACKEND_PING);
      const now = Date.now();

      // If it's been more than 5 minutes since last ping, ping now
      if (!lastPing || now - lastPing > 5 * 60 * 1000) {
        pingBackend();
      }
    }
  });

  // Cleanup on page unload
  window.addEventListener("beforeunload", stopKeepWarm);
}

/**
 * Stop the keep-warm service
 */
export function stopKeepWarm(): void {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  isInitialized = false;
}

/**
 * Get the last ping timestamp
 */
export function getLastPingTime(): number | null {
  return getFromCache<number>(CACHE_KEYS.LAST_BACKEND_PING);
}

/**
 * Check if the backend is likely awake
 * (Based on recent ping success)
 */
export function isBackendLikelyAwake(): boolean {
  const lastPing = getLastPingTime();
  if (!lastPing) return false;

  // If we pinged within the last 12 minutes, backend should be awake
  return Date.now() - lastPing < 12 * 60 * 1000;
}

/**
 * Force an immediate ping (useful before important API calls)
 */
export async function ensureBackendAwake(): Promise<boolean> {
  if (shouldSkipPing()) return true;

  if (isBackendLikelyAwake()) {
    return true;
  }

  return pingBackend();
}
