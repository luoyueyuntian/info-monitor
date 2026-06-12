/**
 * Simple in-memory rate limiter for notification channels.
 *
 * Uses a sliding window approach to limit the number of sends
 * per channel within a configurable time window.
 */

export interface RateLimitConfig {
  /** Maximum number of sends allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Default rate limits per channel
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  webhook: { maxRequests: 60, windowMs: 60_000 },   // 60/min
  telegram: { maxRequests: 30, windowMs: 60_000 },   // 30/min (Telegram Bot API limit)
  email: { maxRequests: 100, windowMs: 60_000 },     // 100/min
  in_app: { maxRequests: Infinity, windowMs: 60_000 }, // unlimited
};

// Channel-specific overrides (can be updated at runtime)
const channelOverrides = new Map<string, RateLimitConfig>();

// Sliding window counters: channel -> timestamps of recent sends
const requestWindows = new Map<string, number[]>();

/**
 * Peek at the current rate limit status without recording a request.
 * Use this for read-only status checks (e.g., GET endpoints).
 */
export function peekRateLimit(channel: string): RateLimitResult {
  const config = channelOverrides.get(channel) || DEFAULT_RATE_LIMITS[channel] || DEFAULT_RATE_LIMITS.webhook;
  const now = Date.now();

  if (config.maxRequests === Infinity) {
    return { allowed: true, remaining: Infinity, resetAt: now };
  }

  const window = requestWindows.get(channel);
  if (!window || window.length === 0) {
    return { allowed: true, remaining: config.maxRequests, resetAt: now };
  }

  // Remove expired entries (non-mutating peek)
  const windowStart = now - config.windowMs;
  let activeCount = 0;
  let oldestActive = now;
  for (const ts of window) {
    if (ts > windowStart) {
      activeCount++;
      if (ts < oldestActive) oldestActive = ts;
    }
  }

  const remaining = Math.max(0, config.maxRequests - activeCount);
  const resetAt = activeCount > 0 ? oldestActive + config.windowMs : now;

  return { allowed: remaining > 0, remaining, resetAt };
}

/**
 * Check if a send is allowed for the given channel.
 * Returns whether the request is allowed and how many remain in the window.
 * NOTE: This records the request immediately. If the send fails, call
 * `releaseLastSlot(channel)` to refund the rate limit slot.
 */
export function checkRateLimit(channel: string): RateLimitResult {
  const config = channelOverrides.get(channel) || DEFAULT_RATE_LIMITS[channel] || DEFAULT_RATE_LIMITS.webhook;
  const now = Date.now();

  if (config.maxRequests === Infinity) {
    return { allowed: true, remaining: Infinity, resetAt: now };
  }

  // Get or create the window for this channel
  let window = requestWindows.get(channel);
  if (!window) {
    window = [];
    requestWindows.set(channel, window);
  }

  // Remove expired entries
  const windowStart = now - config.windowMs;
  while (window.length > 0 && window[0] <= windowStart) {
    window.shift();
  }

  const remaining = Math.max(0, config.maxRequests - window.length);
  const resetAt = window.length > 0 ? window[0] + config.windowMs : now;

  if (remaining <= 0) {
    return { allowed: false, remaining: 0, resetAt };
  }

  // Record this request
  window.push(now);

  return { allowed: true, remaining: remaining - 1, resetAt };
}

/**
 * Update the rate limit configuration for a channel.
 */
export function setChannelRateLimit(channel: string, config: RateLimitConfig): void {
  channelOverrides.set(channel, config);
}

/**
 * Get the current rate limit configuration for a channel.
 */
export function getChannelRateLimit(channel: string): RateLimitConfig {
  return channelOverrides.get(channel) || DEFAULT_RATE_LIMITS[channel] || DEFAULT_RATE_LIMITS.webhook;
}

/**
 * Release the last recorded slot for a channel (call when a send fails).
 */
export function releaseLastSlot(channel: string): void {
  const window = requestWindows.get(channel);
  if (window && window.length > 0) {
    window.pop();
  }
}

/**
 * Reset all rate limit state (useful for testing).
 */
export function resetRateLimits(): void {
  requestWindows.clear();
  channelOverrides.clear();
}
