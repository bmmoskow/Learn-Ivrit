import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashUserIdCached } from "../../utils/hashId/hashUserId";

describe("Admin Dashboard - Guest vs Authenticated User Analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("User ID Hashing for Analytics", () => {
    it("stores guest-user as plain text in database for visibility", async () => {
      const userId = "guest-user";
      const hashedId = await hashUserIdCached(userId);

      // Guest users are NOT hashed - stored as "guest-user" for analytics
      expect(hashedId).toBe("guest-user");
      expect(hashedId).not.toMatch(/^[0-9a-f]{64}$/); // Not a hash
    });

    it("hashes authenticated user IDs for privacy", async () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      const hashedId = await hashUserIdCached(userId);

      // Authenticated users ARE hashed
      expect(hashedId).not.toBe(userId);
      expect(hashedId).toMatch(/^[0-9a-f]{64}$/); // Is a SHA-256 hash
      expect(hashedId).not.toContain("550e");
    });

    it("allows admins to distinguish guest vs authenticated usage", async () => {
      const users = [
        "guest-user",
        "550e8400-e29b-41d4-a716-446655440000",
        "guest-user",
        "23a4b5c6-d78e-90f1-2g3h-4i5j6k7l8m9n",
        "guest-user",
      ];

      const hashedIds = await Promise.all(users.map(hashUserIdCached));

      // Count guest vs authenticated
      const guestCount = hashedIds.filter(id => id === "guest-user").length;
      const authenticatedCount = hashedIds.filter(id => id !== "guest-user").length;

      expect(guestCount).toBe(3);
      expect(authenticatedCount).toBe(2);

      // In admin dashboard, can filter: WHERE user_id = 'guest-user'
      const guestLogs = hashedIds.filter(id => id === "guest-user");
      const authenticatedLogs = hashedIds.filter(id => id !== "guest-user");

      expect(guestLogs).toHaveLength(3);
      expect(authenticatedLogs).toHaveLength(2);
    });
  });

  describe("Database Query Patterns", () => {
    it("simulates admin query to count guest usage", async () => {
      // Simulate what would be in api_usage_logs
      const mockLogs = [
        { user_id: await hashUserIdCached("guest-user"), request_type: "translate" },
        { user_id: await hashUserIdCached("user-1"), request_type: "translate" },
        { user_id: await hashUserIdCached("guest-user"), request_type: "define" },
        { user_id: await hashUserIdCached("user-2"), request_type: "translate" },
        { user_id: await hashUserIdCached("guest-user"), request_type: "define" },
      ];

      // Query: SELECT COUNT(*) FROM api_usage_logs WHERE user_id = 'guest-user'
      const guestUsage = mockLogs.filter(log => log.user_id === "guest-user");
      expect(guestUsage).toHaveLength(3);
    });

    it("simulates admin query to count authenticated usage", async () => {
      const mockLogs = [
        { user_id: await hashUserIdCached("guest-user"), request_type: "translate" },
        { user_id: await hashUserIdCached("user-1"), request_type: "translate" },
        { user_id: await hashUserIdCached("guest-user"), request_type: "define" },
        { user_id: await hashUserIdCached("user-2"), request_type: "translate" },
        { user_id: await hashUserIdCached("guest-user"), request_type: "define" },
      ];

      // Query: SELECT COUNT(*) FROM api_usage_logs WHERE user_id != 'guest-user'
      const authenticatedUsage = mockLogs.filter(log => log.user_id !== "guest-user");
      expect(authenticatedUsage).toHaveLength(2);
    });

    it("simulates admin query to calculate guest vs authenticated ratio", async () => {
      const mockLogs = await Promise.all([
        ...Array(70).fill("guest-user"),
        ...Array(30).fill(null).map((_, i) => `user-${i}`),
      ].map(async (userId) => ({
        user_id: await hashUserIdCached(userId),
        request_type: "translate",
        cost: 0.001,
      })));

      const guestCount = mockLogs.filter(log => log.user_id === "guest-user").length;
      const authenticatedCount = mockLogs.filter(log => log.user_id !== "guest-user").length;
      const total = mockLogs.length;

      const guestPercentage = (guestCount / total) * 100;
      const authenticatedPercentage = (authenticatedCount / total) * 100;

      expect(guestPercentage).toBe(70);
      expect(authenticatedPercentage).toBe(30);
      expect(guestCount + authenticatedCount).toBe(total);
    });

    it("simulates admin query to group costs by user type", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", cost: 0.001 },
        { userId: "guest-user", cost: 0.002 },
        { userId: "user-1", cost: 0.005 },
        { userId: "guest-user", cost: 0.001 },
        { userId: "user-2", cost: 0.010 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        estimated_cost_usd: log.cost,
      })));

      // Group by user type
      const guestCosts = mockLogs
        .filter(log => log.user_id === "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      const authenticatedCosts = mockLogs
        .filter(log => log.user_id !== "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      expect(guestCosts).toBe(0.004); // 0.001 + 0.002 + 0.001
      expect(authenticatedCosts).toBe(0.015); // 0.005 + 0.010
    });
  });

  describe("Admin Dashboard Metrics", () => {
    it("calculates total guest API costs", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", cost: 0.001 },
        { userId: "guest-user", cost: 0.002 },
        { userId: "user-1", cost: 0.005 },
        { userId: "guest-user", cost: 0.003 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        estimated_cost_usd: log.cost,
      })));

      const totalGuestCost = mockLogs
        .filter(log => log.user_id === "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      expect(totalGuestCost).toBe(0.006);
    });

    it("calculates total authenticated API costs", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", cost: 0.001 },
        { userId: "user-1", cost: 0.005 },
        { userId: "user-2", cost: 0.010 },
        { userId: "guest-user", cost: 0.002 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        estimated_cost_usd: log.cost,
      })));

      const totalAuthenticatedCost = mockLogs
        .filter(log => log.user_id !== "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      expect(totalAuthenticatedCost).toBe(0.015);
    });

    it("identifies top request types by user category", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", type: "translate", cost: 0.001 },
        { userId: "guest-user", type: "translate", cost: 0.002 },
        { userId: "guest-user", type: "define", cost: 0.001 },
        { userId: "user-1", type: "translate", cost: 0.005 },
        { userId: "user-2", type: "define", cost: 0.010 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        request_type: log.type,
        estimated_cost_usd: log.cost,
      })));

      // Guest user requests
      const guestRequests = mockLogs.filter(log => log.user_id === "guest-user");
      const guestTranslate = guestRequests.filter(r => r.request_type === "translate").length;
      const guestDefine = guestRequests.filter(r => r.request_type === "define").length;

      expect(guestTranslate).toBe(2);
      expect(guestDefine).toBe(1);

      // Authenticated requests
      const authRequests = mockLogs.filter(log => log.user_id !== "guest-user");
      const authTranslate = authRequests.filter(r => r.request_type === "translate").length;
      const authDefine = authRequests.filter(r => r.request_type === "define").length;

      expect(authTranslate).toBe(1);
      expect(authDefine).toBe(1);
    });

    it("calculates conversion opportunity (guest to authenticated)", async () => {
      const mockLogs = await Promise.all([
        ...Array(85).fill("guest-user"),
        ...Array(15).fill(null).map((_, i) => `user-${i}`),
      ].map(async (userId) => ({
        user_id: await hashUserIdCached(userId),
        cost: 0.001,
      })));

      const guestCount = mockLogs.filter(log => log.user_id === "guest-user").length;
      const authenticatedCount = mockLogs.filter(log => log.user_id !== "guest-user").length;

      const conversionRate = (authenticatedCount / (guestCount + authenticatedCount)) * 100;

      // If 85% are guests, there's significant conversion opportunity
      expect(conversionRate).toBe(15);
      expect(guestCount).toBe(85);
      expect(authenticatedCount).toBe(15);
    });
  });

  describe("Business Intelligence Queries", () => {
    it("identifies features most used by guest users", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", endpoint: "/translate", count: 50 },
        { userId: "guest-user", endpoint: "/define", count: 30 },
        { userId: "guest-user", endpoint: "/generate", count: 10 },
        { userId: "user-1", endpoint: "/translate", count: 20 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        endpoint: log.endpoint,
        usage_count: log.count,
      })));

      const guestUsage = mockLogs.filter(log => log.user_id === "guest-user");

      // Sort by usage count
      const topFeatures = guestUsage.sort((a, b) => b.usage_count - a.usage_count);

      expect(topFeatures[0].endpoint).toBe("/translate");
      expect(topFeatures[0].usage_count).toBe(50);
      expect(topFeatures[1].endpoint).toBe("/define");
      expect(topFeatures[2].endpoint).toBe("/generate");
    });

    it("compares feature adoption between guest and authenticated users", async () => {
      const mockLogs = await Promise.all([
        { userId: "guest-user", endpoint: "/translate", count: 50 },
        { userId: "guest-user", endpoint: "/define", count: 30 },
        { userId: "user-1", endpoint: "/translate", count: 100 },
        { userId: "user-2", endpoint: "/define", count: 80 },
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        endpoint: log.endpoint,
        usage_count: log.count,
      })));

      const guestTranslate = mockLogs
        .filter(log => log.user_id === "guest-user" && log.endpoint === "/translate")
        .reduce((sum, log) => sum + log.usage_count, 0);

      const authTranslate = mockLogs
        .filter(log => log.user_id !== "guest-user" && log.endpoint === "/translate")
        .reduce((sum, log) => sum + log.usage_count, 0);

      // Authenticated users use translate more heavily
      expect(authTranslate).toBeGreaterThan(guestTranslate);
      expect(guestTranslate).toBe(50);
      expect(authTranslate).toBe(100);
    });

    it("identifies cost per user segment", async () => {
      const mockLogs = await Promise.all([
        ...Array(100).fill(null).map(() => ({ userId: "guest-user", cost: 0.001 })),
        ...Array(20).fill(null).map((_, i) => ({ userId: `user-${i}`, cost: 0.010 })),
      ].map(async (log) => ({
        user_id: await hashUserIdCached(log.userId),
        estimated_cost_usd: log.cost,
      })));

      const guestTotalCost = mockLogs
        .filter(log => log.user_id === "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      const authTotalCost = mockLogs
        .filter(log => log.user_id !== "guest-user")
        .reduce((sum, log) => sum + log.estimated_cost_usd, 0);

      const guestCount = mockLogs.filter(log => log.user_id === "guest-user").length;
      const authCount = mockLogs.filter(log => log.user_id !== "guest-user").length;

      const costPerGuestRequest = guestTotalCost / guestCount;
      const costPerAuthRequest = authTotalCost / authCount;

      expect(costPerGuestRequest).toBeCloseTo(0.001, 5);
      expect(costPerAuthRequest).toBeCloseTo(0.010, 5);
      // Authenticated users generate 10x cost per request
      expect(costPerAuthRequest / costPerGuestRequest).toBeCloseTo(10, 1);
    });
  });

  describe("Privacy Verification", () => {
    it("ensures no PII in guest-user entries", async () => {
      const guestId = await hashUserIdCached("guest-user");

      // "guest-user" contains no personally identifiable information
      expect(guestId).toBe("guest-user");
      expect(guestId).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/); // No email
      expect(guestId).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i); // No UUID
      expect(guestId).not.toMatch(/\d{3}-\d{2}-\d{4}/); // No SSN-like patterns
    });

    it("ensures authenticated user IDs are anonymized", async () => {
      const realUserId = "550e8400-e29b-41d4-a716-446655440000";
      const hashedId = await hashUserIdCached(realUserId);

      // Hash should not contain any part of original ID
      expect(hashedId).not.toContain(realUserId);
      expect(hashedId).not.toContain("550e");
      expect(hashedId).not.toContain("8400");
      expect(hashedId).not.toContain("e29b");

      // Should be irreversible
      expect(hashedId).toMatch(/^[0-9a-f]{64}$/);
    });

    it("allows compliance-safe analytics for both user types", async () => {
      const users = [
        "guest-user", // No PII, useful for analytics
        "550e8400-e29b-41d4-a716-446655440000", // PII, gets hashed
        "guest-user", // No PII, useful for analytics
      ];

      const hashedIds = await Promise.all(users.map(hashUserIdCached));

      // Guest entries are identifiable as group
      const guestEntries = hashedIds.filter(id => id === "guest-user");
      expect(guestEntries).toHaveLength(2);

      // Authenticated entries are anonymized
      const authEntries = hashedIds.filter(id => id !== "guest-user");
      expect(authEntries).toHaveLength(1);
      expect(authEntries[0]).toMatch(/^[0-9a-f]{64}$/);

      // Both comply with privacy requirements:
      // - No individual user tracking
      // - Aggregate analytics only
      // - Clear distinction for business intelligence
    });
  });
});
