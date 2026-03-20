import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hashUserId,
  hashUserIdCached,
  clearHashCache,
  getHashCacheSize,
} from "./hashUserId";

describe("hashUserId", () => {
  describe("Basic Hashing", () => {
    it("returns a SHA-256 hash as a hex string", async () => {
      const userId = "test-user-123";
      const hash = await hashUserId(userId);

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });

    it("produces consistent hashes for the same input", async () => {
      const userId = "consistent-user";
      const hash1 = await hashUserId(userId);
      const hash2 = await hashUserId(userId);

      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different inputs", async () => {
      const hash1 = await hashUserId("user-1");
      const hash2 = await hashUserId("user-2");

      expect(hash1).not.toBe(hash2);
    });

    it("handles empty string input", async () => {
      const hash = await hashUserId("");

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles UUID format user IDs", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const hash = await hashUserId(userId);

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles long string inputs", async () => {
      const userId = "a".repeat(1000);
      const hash = await hashUserId(userId);

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles special characters", async () => {
      const userId = "user@example.com!#$%^&*()";
      const hash = await hashUserId(userId);

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles unicode characters", async () => {
      const userId = "用户-123-🔒";
      const hash = await hashUserId(userId);

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("produces deterministic output for known input", async () => {
      // Known SHA-256 hash for "test"
      const hash = await hashUserId("test");

      // This is the actual SHA-256 hash of "test"
      const expectedHash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

      expect(hash).toBe(expectedHash);
    });
  });

  describe("Edge Cases", () => {
    it("handles numeric string inputs", async () => {
      const hash = await hashUserId("12345");

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles whitespace in input", async () => {
      const hash1 = await hashUserId("user 123");
      const hash2 = await hashUserId("user123");

      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash2.length).toBe(64);
    });

    it("handles leading and trailing whitespace", async () => {
      const hash1 = await hashUserId("  user  ");
      const hash2 = await hashUserId("user");

      expect(hash1).not.toBe(hash2);
    });

    it("handles newline characters", async () => {
      const hash = await hashUserId("user\nid");

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });

    it("handles tab characters", async () => {
      const hash = await hashUserId("user\tid");

      expect(hash).toBeTypeOf("string");
      expect(hash.length).toBe(64);
    });
  });

  describe("Security Properties", () => {
    it("produces different hashes for similar inputs", async () => {
      const hash1 = await hashUserId("user1");
      const hash2 = await hashUserId("user2");
      const hash3 = await hashUserId("User1");

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it("is case sensitive", async () => {
      const hashLower = await hashUserId("test");
      const hashUpper = await hashUserId("TEST");

      expect(hashLower).not.toBe(hashUpper);
    });

    it("cannot reverse hash to original value", async () => {
      const userId = "secret-user-id";
      const hash = await hashUserId(userId);

      // Hash should not contain the original user ID
      expect(hash).not.toContain(userId);
      expect(hash).not.toContain("secret");
    });
  });

  describe("Performance", () => {
    it("completes hashing quickly", async () => {
      const startTime = performance.now();
      await hashUserId("performance-test-user");
      const endTime = performance.now();

      // Should complete in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("handles multiple sequential hashes", async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(hashUserId(`user-${i}`));
      }

      const hashes = await Promise.all(promises);

      expect(hashes).toHaveLength(10);
      expect(new Set(hashes).size).toBe(10); // All unique
    });
  });
});

describe("hashUserIdCached", () => {
  beforeEach(() => {
    clearHashCache();
  });

  describe("Caching Behavior", () => {
    it("returns the same hash as non-cached version", async () => {
      const userId = "test-user";
      const hash1 = await hashUserId(userId);
      const hash2 = await hashUserIdCached(userId);

      expect(hash1).toBe(hash2);
    });

    it("caches the hash after first call", async () => {
      const userId = "cache-test-user";

      expect(getHashCacheSize()).toBe(0);

      await hashUserIdCached(userId);

      expect(getHashCacheSize()).toBe(1);
    });

    it("returns cached value on subsequent calls", async () => {
      const userId = "repeated-user";

      const hash1 = await hashUserIdCached(userId);
      const hash2 = await hashUserIdCached(userId);

      expect(hash1).toBe(hash2);
      expect(getHashCacheSize()).toBe(1); // Only one entry
    });

    it("caches multiple different user IDs", async () => {
      await hashUserIdCached("user-1");
      await hashUserIdCached("user-2");
      await hashUserIdCached("user-3");

      expect(getHashCacheSize()).toBe(3);
    });

    it("does not call hashUserId twice for the same input", async () => {
      const spy = vi.spyOn(crypto.subtle, "digest");

      const userId = "spy-test-user";
      await hashUserIdCached(userId);
      await hashUserIdCached(userId);

      // Should only call digest once (first time)
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it("maintains separate cache entries for different inputs", async () => {
      const hash1 = await hashUserIdCached("user-a");
      const hash2 = await hashUserIdCached("user-b");
      const hash3 = await hashUserIdCached("user-a"); // Should use cache

      expect(hash1).toBe(hash3);
      expect(hash1).not.toBe(hash2);
      expect(getHashCacheSize()).toBe(2);
    });
  });

  describe("Cache Performance", () => {
    it("is faster on cached calls", async () => {
      const userId = "performance-user";

      const startTime1 = performance.now();
      await hashUserIdCached(userId);
      const duration1 = performance.now() - startTime1;

      const startTime2 = performance.now();
      await hashUserIdCached(userId);
      const duration2 = performance.now() - startTime2;

      // Cached call should be significantly faster
      // Note: This may be flaky, so we're generous with the threshold
      expect(duration2).toBeLessThan(duration1);
    });

    it("handles many cache entries efficiently", async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(hashUserIdCached(`user-${i}`));
      }

      await Promise.all(promises);

      expect(getHashCacheSize()).toBe(100);

      // Accessing cached values should be fast
      const startTime = performance.now();
      await hashUserIdCached("user-50");
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5);
    });
  });

  describe("Edge Cases with Cache", () => {
    it("handles empty string caching", async () => {
      const hash1 = await hashUserIdCached("");
      const hash2 = await hashUserIdCached("");

      expect(hash1).toBe(hash2);
      expect(getHashCacheSize()).toBe(1);
    });

    it("caches unicode characters correctly", async () => {
      const userId = "用户-🔒";
      const hash1 = await hashUserIdCached(userId);
      const hash2 = await hashUserIdCached(userId);

      expect(hash1).toBe(hash2);
      expect(getHashCacheSize()).toBe(1);
    });

    it("maintains cache across multiple calls", async () => {
      await hashUserIdCached("user-1");
      expect(getHashCacheSize()).toBe(1);

      await hashUserIdCached("user-2");
      expect(getHashCacheSize()).toBe(2);

      await hashUserIdCached("user-1"); // Should use cache
      expect(getHashCacheSize()).toBe(2);

      await hashUserIdCached("user-3");
      expect(getHashCacheSize()).toBe(3);
    });
  });
});

describe("clearHashCache", () => {
  beforeEach(() => {
    clearHashCache();
  });

  it("clears all cached entries", async () => {
    await hashUserIdCached("user-1");
    await hashUserIdCached("user-2");
    await hashUserIdCached("user-3");

    expect(getHashCacheSize()).toBe(3);

    clearHashCache();

    expect(getHashCacheSize()).toBe(0);
  });

  it("allows cache to be repopulated after clearing", async () => {
    await hashUserIdCached("user-1");
    expect(getHashCacheSize()).toBe(1);

    clearHashCache();
    expect(getHashCacheSize()).toBe(0);

    await hashUserIdCached("user-2");
    expect(getHashCacheSize()).toBe(1);
  });

  it("forces rehashing after cache clear", async () => {
    const userId = "test-user";
    const hash1 = await hashUserIdCached(userId);

    clearHashCache();

    const hash2 = await hashUserIdCached(userId);

    expect(hash1).toBe(hash2); // Same hash
    expect(getHashCacheSize()).toBe(1); // Re-cached
  });

  it("can be called multiple times safely", () => {
    clearHashCache();
    clearHashCache();
    clearHashCache();

    expect(getHashCacheSize()).toBe(0);
  });

  it("clears cache with many entries", async () => {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(hashUserIdCached(`user-${i}`));
    }
    await Promise.all(promises);

    expect(getHashCacheSize()).toBe(50);

    clearHashCache();

    expect(getHashCacheSize()).toBe(0);
  });
});

describe("getHashCacheSize", () => {
  beforeEach(() => {
    clearHashCache();
  });

  it("returns 0 for empty cache", () => {
    expect(getHashCacheSize()).toBe(0);
  });

  it("returns correct size after adding entries", async () => {
    expect(getHashCacheSize()).toBe(0);

    await hashUserIdCached("user-1");
    expect(getHashCacheSize()).toBe(1);

    await hashUserIdCached("user-2");
    expect(getHashCacheSize()).toBe(2);

    await hashUserIdCached("user-3");
    expect(getHashCacheSize()).toBe(3);
  });

  it("does not increase for duplicate entries", async () => {
    await hashUserIdCached("user-1");
    expect(getHashCacheSize()).toBe(1);

    await hashUserIdCached("user-1");
    expect(getHashCacheSize()).toBe(1);

    await hashUserIdCached("user-1");
    expect(getHashCacheSize()).toBe(1);
  });

  it("returns correct size after clearing", async () => {
    await hashUserIdCached("user-1");
    await hashUserIdCached("user-2");
    expect(getHashCacheSize()).toBe(2);

    clearHashCache();
    expect(getHashCacheSize()).toBe(0);
  });

  it("accurately tracks large cache sizes", async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(hashUserIdCached(`user-${i}`));
    }
    await Promise.all(promises);

    expect(getHashCacheSize()).toBe(100);
  });
});

describe("Integration Tests", () => {
  beforeEach(() => {
    clearHashCache();
  });

  it("cached and non-cached versions produce identical results", async () => {
    const userIds = ["user-1", "user-2", "test@example.com", "用户-123"];

    for (const userId of userIds) {
      const hashNormal = await hashUserId(userId);
      const hashCached = await hashUserIdCached(userId);
      expect(hashNormal).toBe(hashCached);
    }
  });

  it("handles mixed usage of cached and non-cached functions", async () => {
    const userId = "mixed-test-user";

    const hash1 = await hashUserId(userId);
    const hash2 = await hashUserIdCached(userId);
    const hash3 = await hashUserId(userId);
    const hash4 = await hashUserIdCached(userId);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
    expect(hash3).toBe(hash4);
  });

  it("maintains cache integrity across concurrent operations", async () => {
    const promises = [];

    // Mix of new and repeated user IDs
    promises.push(hashUserIdCached("user-1"));
    promises.push(hashUserIdCached("user-2"));
    promises.push(hashUserIdCached("user-1"));
    promises.push(hashUserIdCached("user-3"));
    promises.push(hashUserIdCached("user-2"));
    promises.push(hashUserIdCached("user-1"));

    const hashes = await Promise.all(promises);

    expect(hashes[0]).toBe(hashes[2]); // user-1
    expect(hashes[0]).toBe(hashes[5]); // user-1
    expect(hashes[1]).toBe(hashes[4]); // user-2
    expect(getHashCacheSize()).toBe(3); // Only 3 unique users
  });

  it("cache survives multiple operations", async () => {
    // First batch
    await hashUserIdCached("user-1");
    await hashUserIdCached("user-2");
    expect(getHashCacheSize()).toBe(2);

    // Second batch with one duplicate
    await hashUserIdCached("user-2");
    await hashUserIdCached("user-3");
    expect(getHashCacheSize()).toBe(3);

    // Third batch with all duplicates
    await hashUserIdCached("user-1");
    await hashUserIdCached("user-2");
    await hashUserIdCached("user-3");
    expect(getHashCacheSize()).toBe(3);
  });
});

describe("Real-world Usage Scenarios", () => {
  beforeEach(() => {
    clearHashCache();
  });

  it("handles typical UUID user IDs from Supabase", async () => {
    const supabaseUserId = "550e8400-e29b-41d4-a716-446655440000";
    const hash = await hashUserIdCached(supabaseUserId);

    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBe(64);
    expect(getHashCacheSize()).toBe(1);
  });

  it("efficiently handles repeated user ID lookups in session", async () => {
    const userId = "current-session-user";

    // Simulate multiple API calls in a session
    for (let i = 0; i < 20; i++) {
      await hashUserIdCached(userId);
    }

    // Should only have one cache entry despite 20 calls
    expect(getHashCacheSize()).toBe(1);
  });

  it("handles batch processing of multiple users", async () => {
    const userIds = Array.from({ length: 50 }, (_, i) => `user-${i}`);

    const startTime = performance.now();
    const hashes = await Promise.all(userIds.map(hashUserIdCached));
    const duration = performance.now() - startTime;

    expect(hashes).toHaveLength(50);
    expect(new Set(hashes).size).toBe(50); // All unique
    expect(getHashCacheSize()).toBe(50);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  it("supports cache warming for frequent users", async () => {
    const frequentUsers = ["user-a", "user-b", "user-c"];

    // Warm the cache
    await Promise.all(frequentUsers.map(hashUserIdCached));
    expect(getHashCacheSize()).toBe(3);

    // Subsequent lookups should be instant from cache
    for (let i = 0; i < 10; i++) {
      const randomUser = frequentUsers[i % 3];
      await hashUserIdCached(randomUser);
    }

    expect(getHashCacheSize()).toBe(3); // Still just 3 entries
  });
});
