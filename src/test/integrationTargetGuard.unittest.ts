import { describe, it, expect } from "vitest";
import { isLocalSupabaseUrl, assertSafeIntegrationTarget } from "./integrationTargetGuard";

// Fabricated placeholder refs — the guard tests exercise LOGIC (localhost
// detection, CI allow-list, fail-closed, local-sandbox-only), so the values are
// arbitrary. Do NOT replace these with real project refs. The only invariants
// the tests rely on: TESTPROJ contains TESTREF, REMOTE does not, and neither is
// a localhost URL.
const REMOTE = "https://someremoteref000000.supabase.co";
const TESTPROJ = "https://testprojectref000000.supabase.co";
const TESTREF = "testprojectref000000";
const LOCAL = "http://127.0.0.1:54321";

describe("isLocalSupabaseUrl", () => {
  it("accepts localhost and 127.0.0.1", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://[::1]:54321")).toBe(true);
  });
  it("rejects remote and malformed URLs", () => {
    expect(isLocalSupabaseUrl(REMOTE)).toBe(false);
    expect(isLocalSupabaseUrl(TESTPROJ)).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
    expect(isLocalSupabaseUrl("")).toBe(false);
  });
});

describe("assertSafeIntegrationTarget", () => {
  // --- local runs: the Docker sandbox is the ONLY allowed target ---
  it("ALLOWS a localhost target (local or CI)", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: LOCAL, expectedRef: "", isCI: false }),
    ).not.toThrow();
    // even in CI, and even when an expected ref is set — localhost is never prod
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: LOCAL, expectedRef: TESTREF, isCI: true }),
    ).not.toThrow();
  });

  it("locally REFUSES any non-localhost target", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: REMOTE, expectedRef: "", isCI: false }),
    ).toThrow(/local Docker sandbox/i);
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: "", isCI: false }),
    ).toThrow(/local Docker sandbox/i);
  });

  // --- CI: the remote TEST project, gated by a positive allow-list ---
  it("allows the expected test project in CI when its ref matches", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: TESTREF, isCI: true }),
    ).not.toThrow();
  });

  it("BLOCKS a non-matching target when an expected ref is set", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: REMOTE, expectedRef: TESTREF, isCI: true }),
    ).toThrow(/not the expected project/i);
  });

  it("FAILS CLOSED in CI when no expected ref is configured", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: "", isCI: true }),
    ).toThrow(/EXPECTED_SUPABASE_PROJECT_REF/i);
  });
});
