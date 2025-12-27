import { kv } from "@vercel/kv";

const DEFAULT_TTL_SECONDS = 30 * 60; // 30 minutes

// Helper function for cache-wrapped async operations using Vercel KV
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  try {
    // Check KV cache first
    const cached = await kv.get<T>(`cache:${key}`);
    if (cached !== null) {
      console.log(`[Cache HIT] ${key}`);
      return cached;
    }

    console.log(`[Cache MISS] ${key}`);

    // Fetch fresh data
    const data = await fetcher();

    // Store in KV cache with TTL (convert ms to seconds)
    const ttlSeconds = ttlMs ? Math.floor(ttlMs / 1000) : DEFAULT_TTL_SECONDS;
    await kv.setex(`cache:${key}`, ttlSeconds, data);

    return data;
  } catch (error) {
    console.error(`[Cache ERROR] ${key}:`, error);
    // If KV fails, just fetch the data without caching
    return await fetcher();
  }
}

// Clear specific cache key
export async function clearCache(key: string): Promise<void> {
  try {
    await kv.del(`cache:${key}`);
  } catch (error) {
    console.error(`[Cache CLEAR ERROR] ${key}:`, error);
  }
}

// Clear all cache with specific prefix
export async function clearCachePattern(pattern: string): Promise<void> {
  try {
    // Note: This requires getting all keys and deleting them
    // For now, we'll just log - full pattern matching needs more complex logic
    console.log(`[Cache] Clear pattern not fully implemented: ${pattern}`);
  } catch (error) {
    console.error(`[Cache PATTERN ERROR] ${pattern}:`, error);
  }
}
