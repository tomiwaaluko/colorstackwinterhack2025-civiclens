import { NextResponse } from "next/server";

/**
 * API Route: Keep Backend Warm
 *
 * This endpoint pings the backend to prevent Render free tier from spinning down.
 * Can be called by:
 * - External cron services (cron-job.org, UptimeRobot, etc.)
 * - Vercel Cron Jobs (if deployed on Vercel)
 *
 * To set up Vercel Cron, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/keep-warm",
 *     "schedule": "0,10,20,30,40,50 * * * *"
 *   }]
 * }
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BACKEND_API_URL = process.env.BACKEND_API_URL || API_BASE_URL;

export async function GET() {
  // Skip in development
  if (process.env.NODE_ENV === "development") {
    return NextResponse.json({
      status: "skipped",
      reason: "development environment",
    });
  }

  // Skip if demo mode
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json({
      status: "skipped",
      reason: "demo mode enabled",
    });
  }

  try {
    const startTime = Date.now();

    const response = await fetch(`${BACKEND_API_URL}/health`, {
      method: "GET",
      headers: {
        "User-Agent": "CivicLens-KeepWarm/1.0",
      },
      // Timeout after 30 seconds (Render cold start can take a while)
      signal: AbortSignal.timeout(30000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));

      return NextResponse.json({
        status: "success",
        backend: "healthy",
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
        backendResponse: data,
      });
    }

    return NextResponse.json(
      {
        status: "warning",
        backend: "unhealthy",
        statusCode: response.status,
        latency: `${latency}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    ); // Return 200 so cron doesn't retry
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "error",
        backend: "unreachable",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    ); // Return 200 so cron doesn't retry
  }
}

// Force dynamic to ensure handler runs on every request
export const dynamic = "force-dynamic";
