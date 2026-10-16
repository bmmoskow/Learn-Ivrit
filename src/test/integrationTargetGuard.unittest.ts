import { describe, it, expect } from "vitest";
import { isLocalSupabaseUrl, assertSafeIntegrationTarget } from "./integrationTargetGuard";

// Fabricated placeholder refs — the guard tests exercise LOGIC (localhost
// detection, ref matching, prod-blocking, fail-closed), so the values are
// arbitrary. Do NOT replace these with real project refs; the only invariants
// the tests rely on are: TESTPROJ contains TESTREF, PROD does not, and neither
// is a localhost URL.
const PROD = "https://prodprojectref000000.supabase.co";
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
    expect(isLocalSupabaseUrl(PROD)).toBe(false);
    expect(isLocalSupabaseUrl(TESTPROJ)).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
    expect(isLocalSupabaseUrl("")).toBe(false);
  });
});

describe("assertSafeIntegrationTarget", () => {
  // --- the new local-sandbox behavior ---
  it("ALLOWS a localhost target regardless of ref/CI", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: LOCAL, expectedRef: "", isCI: false, prodUrl: PROD }),
    ).not.toThrow();
    // even in CI, and even when an expected (remote) ref is set — localhost is never prod
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: LOCAL, expectedRef: TESTREF, isCI: true, prodUrl: PROD }),
    ).not.toThrow();
  });

  // --- the existing guards must still hold ---
  it("allows the expected test project when its ref matches", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: TESTREF, isCI: true, prodUrl: PROD }),
    ).not.toThrow();
  });

  it("BLOCKS a non-matching (e.g. prod) target when an expected ref is set", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: PROD, expectedRef: TESTREF, isCI: true, prodUrl: PROD }),
    ).toThrow(/not the expected project/i);
  });

  it("FAILS CLOSED in CI when no expected ref is configured", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: "", isCI: true, prodUrl: PROD }),
    ).toThrow(/must set the SUPABASE_TEST_PROJECT_REF/i);
  });

  it("locally (no ref) BLOCKS a target that equals the prod URL", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: PROD, expectedRef: "", isCI: false, prodUrl: PROD }),
    ).toThrow(/production/i);
  });

  it("locally (no ref) allows a non-prod remote target", () => {
    expect(() =>
      assertSafeIntegrationTarget({ targetUrl: TESTPROJ, expectedRef: "", isCI: false, prodUrl: PROD }),
    ).not.toThrow();
  });
});
