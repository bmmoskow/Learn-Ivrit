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

describe("Guest User Handling", () => {
  beforeEach(() => {
    clearHashCache();
  });

  describe("Guest User Pass-Through", () => {
    it("returns 'guest-user' without hashing", async () => {
      const result = await hashUserIdCached("guest-user");
      expect(result).toBe("guest-user");
    });

    it("does not hash guest-user (returns as-is, not 64-char hash)", async () => {
      const result = await hashUserIdCached("guest-user");
      expect(result.length).not.toBe(64); // Not a SHA-256 hash
      expect(result).toBe("guest-user");
    });

    it("does not cache guest-user", async () => {
      await hashUserIdCached("guest-user");
      expect(getHashCacheSize()).toBe(0); // Guest user doesn't consume cache
    });

    it("handles multiple guest-user calls without caching", async () => {
      await hashUserIdCached("guest-user");
      await hashUserIdCached("guest-user");
      await hashUserIdCached("guest-user");
      expect(getHashCacheSize()).toBe(0);
    });

    it("returns guest-user immediately without crypto computation", async () => {
      const spy = vi.spyOn(crypto.subtle, "digest");

      await hashUserIdCached("guest-user");

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("Guest vs Authenticated Users", () => {
    it("distinguishes between guest-user and actual users", async () => {
      const guestHash = await hashUserIdCached("guest-user");
      const userHash = await hashUserIdCached("550e8400-e29b-41d4-a716-446655440000");

      expect(guestHash).toBe("guest-user");
      expect(userHash).not.toBe("guest-user");
      expect(userHash.length).toBe(64);
    });

    it("handles mixed guest and authenticated users in same session", async () => {
      const results = await Promise.all([
        hashUserIdCached("guest-user"),
        hashUserIdCached("user-123"),
        hashUserIdCached("guest-user"),
        hashUserIdCached("user-456"),
      ]);

      expect(results[0]).toBe("guest-user");
      expect(results[1]).not.toBe("guest-user");
      expect(results[1].length).toBe(64);
      expect(results[2]).toBe("guest-user");
      expect(results[3]).not.toBe("guest-user");
      expect(results[3].length).toBe(64);

      // Only actual users are cached, not guest-user
      expect(getHashCacheSize()).toBe(2);
    });

    it("handles case-sensitive guest-user check", async () => {
      const lowercase = await hashUserIdCached("guest-user");
      const uppercase = await hashUserIdCached("GUEST-USER");
      const mixedcase = await hashUserIdCached("Guest-User");

      // Only exact "guest-user" passes through
      expect(lowercase).toBe("guest-user");
      expect(uppercase).not.toBe("GUEST-USER");
      expect(uppercase.length).toBe(64); // Gets hashed
      expect(mixedcase.length).toBe(64); // Gets hashed
    });

    it("treats guest-user variants as regular users", async () => {
      const variants = [
        "guest-user-1",
        "guest-user-2",
        "my-guest-user",
        "guestuser",
        "guest user",
      ];

      const hashes = await Promise.all(variants.map(hashUserIdCached));

      // None of these should be treated as guest-user
      hashes.forEach((hash) => {
        expect(hash.length).toBe(64);
        expect(hash).not.toContain("guest");
      });

      expect(getHashCacheSize()).toBe(5);
    });
  });

  describe("Database Anonymity Requirements", () => {
    it("guest-user provides clear analytics visibility in DB", async () => {
      const result = await hashUserIdCached("guest-user");
      // In the database, admins will see "guest-user" instead of a hash
      // This makes it immediately obvious which usage is from guests
      expect(result).toBe("guest-user");
    });

    it("authenticated users remain anonymous via hashing", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const hash = await hashUserIdCached(userId);

      // Actual user IDs are still hashed for privacy
      expect(hash).not.toContain(userId);
      expect(hash).not.toContain("550e");
      expect(hash.length).toBe(64);
    });

    it("allows easy filtering of guest vs authenticated usage in queries", async () => {
      const mixedUsers = [
        "guest-user",
        "550e8400-e29b-41d4-a716-446655440000",
        "guest-user",
        "23a4b5c6-d78e-90f1-2g3h-4i5j6k7l8m9n",
        "guest-user",
      ];

      const hashes = await Promise.all(mixedUsers.map(hashUserIdCached));

      // In DB, you can filter with: WHERE user_id = 'guest-user'
      const guestCount = hashes.filter(h => h === "guest-user").length;
      const authenticatedCount = hashes.filter(h => h !== "guest-user").length;

      expect(guestCount).toBe(3);
      expect(authenticatedCount).toBe(2);
    });
  });

  describe("Performance with Guest Users", () => {
    it("guest-user lookups are faster than hashed lookups", async () => {
      const guestStart = performance.now();
      await hashUserIdCached("guest-user");
      const guestDuration = performance.now() - guestStart;

      const userStart = performance.now();
      await hashUserIdCached("550e8400-e29b-41d4-a716-446655440000");
      const userDuration = performance.now() - userStart;

      // Guest lookups should be instant (no crypto)
      expect(guestDuration).toBeLessThan(userDuration);
      expect(guestDuration).toBeLessThan(1); // Should be sub-millisecond
    });

    it("handles high-volume guest traffic efficiently", async () => {
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(hashUserIdCached("guest-user"));
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Should handle 1000 guest lookups very quickly
      expect(duration).toBeLessThan(50);
      expect(getHashCacheSize()).toBe(0); // No cache bloat
    });
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

  it("simulates realistic mixed traffic pattern", async () => {
    // Simulate 70% guest users, 30% authenticated
    const trafficPattern = [
      ...Array(70).fill("guest-user"),
      ...Array(30).fill(null).map((_, i) => `user-${i}`),
    ];

    const hashes = await Promise.all(trafficPattern.map(hashUserIdCached));

    const guestCount = hashes.filter(h => h === "guest-user").length;
    const authenticatedCount = hashes.filter(h => h !== "guest-user").length;

    expect(guestCount).toBe(70);
    expect(authenticatedCount).toBe(30);
    expect(getHashCacheSize()).toBe(30); // Only authenticated users cached
  });
});
