import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for API routes
 * Uses a sliding window approach with token bucket algorithm
 * 
 * Note: In production with multiple instances, use Redis or similar
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory store for rate limit entries
const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - 3600000; // Remove entries older than 1 hour
  
  for (const [key, entry] of store.entries()) {
    if (entry.lastRefill < cutoff) {
      store.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the interval */
  limit: number;
  /** Time window in milliseconds */
  interval: number;
  /** Unique identifier prefix (e.g., "invite", "insights") */
  identifier: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param key - Unique identifier for the client (e.g., user ID, IP)
 * @param options - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  cleanup();
  
  const { limit, interval, identifier } = options;
  const now = Date.now();
  const fullKey = `${identifier}:${key}`;
  
  // Get or create entry
  let entry = store.get(fullKey);
  
  if (!entry) {
    entry = {
      tokens: limit,
      lastRefill: now,
    };
    store.set(fullKey, entry);
  }
  
  // Calculate tokens to add based on time passed
  const timePassed = now - entry.lastRefill;
  const tokensToAdd = Math.floor((timePassed / interval) * limit);
  
  if (tokensToAdd > 0) {
    entry.tokens = Math.min(limit, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }
  
  // Check if we have tokens available
  if (entry.tokens > 0) {
    entry.tokens--;
    return {
      success: true,
      remaining: entry.tokens,
      reset: Math.ceil((interval - (now - entry.lastRefill)) / 1000),
      limit,
    };
  }
  
  // Rate limited
  return {
    success: false,
    remaining: 0,
    reset: Math.ceil((interval - (now - entry.lastRefill)) / 1000),
    limit,
  };
}

/**
 * Higher-order function to create a rate-limited API handler
 */
export function withRateLimit(
  options: RateLimitOptions,
  getKey: (request: Request) => string | Promise<string>
) {
  return async function checkRateLimit(request: Request): Promise<NextResponse | null> {
    const key = await getKey(request);
    const result = rateLimit(key, options);
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Please try again in ${result.reset} seconds.`,
          retryAfter: result.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": result.reset.toString(),
          },
        }
      );
    }
    
    return null; // Not rate limited, continue with request
  };
}

// ============================================
// Pre-configured rate limiters for common use cases
// ============================================

/** Rate limit for user invitations: 10 per hour */
export const inviteRateLimit = {
  limit: 10,
  interval: 3600000, // 1 hour
  identifier: "invite",
};

/** Rate limit for AI insights generation: 20 per hour */
export const insightsRateLimit = {
  limit: 20,
  interval: 3600000, // 1 hour
  identifier: "insights",
};

/** Rate limit for report exports: 30 per hour */
export const exportRateLimit = {
  limit: 30,
  interval: 3600000, // 1 hour
  identifier: "export",
};

/** Rate limit for observations sync: 60 per hour */
export const syncRateLimit = {
  limit: 60,
  interval: 3600000, // 1 hour
  identifier: "sync",
};

/** General API rate limit: 100 per minute */
export const generalRateLimit = {
  limit: 100,
  interval: 60000, // 1 minute
  identifier: "general",
};

