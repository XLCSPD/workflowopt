import { NextResponse } from "next/server";

/**
 * Health check endpoint for Docker/Kubernetes probes
 * Returns 200 if the service is healthy
 */
export async function GET() {
  const healthcheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  };

  try {
    return NextResponse.json(healthcheck, { status: 200 });
  } catch {
    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}

