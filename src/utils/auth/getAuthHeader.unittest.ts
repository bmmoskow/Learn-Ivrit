import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAuthHeader, getAuthToken } from "./getAuthHeader";

// Mock supabase client
const mockGetSession = vi.fn();
vi.mock("../../../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

describe("getAuthHeader", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.assign(import.meta.env, originalEnv);
  });

  describe("getAuthHeader", () => {
    it("returns session token with Bearer prefix when user is authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "user-session-token",
          },
        },
      });

      const result = await getAuthHeader();

      expect(result).toBe("Bearer user-session-token");
    });

    it("returns anon key with Bearer prefix when no session exists (guest mode)", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      });

      const result = await getAuthHeader();

      expect(result).toBe("Bearer test-anon-key");
    });

    it("returns anon key when session data is undefined", async () => {
      mockGetSession.mockResolvedValue({
        data: {},
      });

      const result = await getAuthHeader();

      expect(result).toBe("Bearer test-anon-key");
    });
  });

  describe("getAuthToken", () => {
    it("returns session token without prefix when user is authenticated", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "user-session-token",
          },
        },
      });

      const result = await getAuthToken();

      expect(result).toBe("user-session-token");
    });

    it("returns anon key without prefix when no session exists (guest mode)", async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      });

      const result = await getAuthToken();

      expect(result).toBe("test-anon-key");
    });
  });
});
