/**
 * SHA-256 hash a user ID for privacy-safe storage in api_usage_logs.
 * Returns a hex-encoded hash string.
 * Uses the Web Crypto API (available in all modern browsers).
 */
export async function hashUserId(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Cache hashed IDs to avoid redundant async calls */
const hashCache = new Map<string, string>();

/**
 * Cached version of hashUserId. Computes once per raw ID per session.
 * Special case: "guest-user" is returned as-is for better analytics visibility.
 */
export async function hashUserIdCached(userId: string): Promise<string> {
  // Don't hash guest-user - it contains no PII and is useful for analytics
  if (userId === "guest-user") {
    return userId;
  }

  const cached = hashCache.get(userId);
  if (cached) return cached;
  const hashed = await hashUserId(userId);
  hashCache.set(userId, hashed);
  return hashed;
}

/**
 * Clear the hash cache. Useful for testing or memory management.
 */
export function clearHashCache(): void {
  hashCache.clear();
}

/**
 * Get the current size of the hash cache.
 */
export function getHashCacheSize(): number {
  return hashCache.size;
}
