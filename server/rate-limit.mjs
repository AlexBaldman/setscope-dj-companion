import { HttpRequestError } from "./json.mjs";

export function createFixedWindowRateLimiter({
  limit = 30,
  windowMs = 60_000,
  maxBuckets = 5000,
  now = () => Date.now(),
} = {}) {
  const normalizedLimit = Math.max(1, Math.round(Number(limit) || 30));
  const normalizedWindowMs = Math.max(1000, Math.round(Number(windowMs) || 60_000));
  const normalizedMaxBuckets = Math.max(100, Math.round(Number(maxBuckets) || 5000));
  const buckets = new Map();

  function consume(key = "anonymous") {
    const timestamp = now();
    pruneExpired(timestamp);
    const bucketKey = String(key || "anonymous").slice(0, 160);
    const previous = buckets.get(bucketKey);
    const bucket = !previous || timestamp >= previous.resetAt
      ? { count: 0, resetAt: timestamp + normalizedWindowMs }
      : previous;
    if (bucket.count >= normalizedLimit) {
      throw new HttpRequestError(429, "recognition_rate_limit_exceeded", {
        retryAfterMs: Math.max(0, bucket.resetAt - timestamp),
      });
    }
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    return {
      limit: normalizedLimit,
      remaining: Math.max(0, normalizedLimit - bucket.count),
      resetAt: bucket.resetAt,
    };
  }

  function pruneExpired(timestamp) {
    if (buckets.size < normalizedMaxBuckets) return;
    for (const [key, bucket] of buckets) {
      if (timestamp >= bucket.resetAt) buckets.delete(key);
    }
    while (buckets.size >= normalizedMaxBuckets) {
      buckets.delete(buckets.keys().next().value);
    }
  }

  return { consume };
}
