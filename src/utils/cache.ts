/**
 * cache.ts
 *
 * Lightweight in-memory TTL cache to eliminate remote DB latency
 * for high-frequency read endpoints (menu, categories, tables layout).
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<any>>();

export class MemoryCache {
  /**
   * Get cached value or compute and store it if expired / missing.
   * @param key Unique cache key (e.g. "menu:all", "categories:list")
   * @param ttlMs Time-to-live in milliseconds (e.g. 15000 = 15s)
   * @param computeFn Async function that queries DB if cache misses
   */
  static async getOrSet<T>(
    key: string,
    ttlMs: number,
    computeFn: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now();
    const existing = store.get(key);

    if (existing && existing.expiry > now) {
      return existing.data;
    }

    const freshData = await computeFn();
    store.set(key, {
      data: freshData,
      expiry: now + ttlMs,
    });

    return freshData;
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. "menu:", "categories:").
   */
  static invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  static clear(): void {
    store.clear();
  }
}
