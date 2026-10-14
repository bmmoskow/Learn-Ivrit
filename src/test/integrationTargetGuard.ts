// Safety guard for the integration-test target URL. Pure logic so it can be
// unit-tested; used by vitest.integration.config.ts.
//
// The whole point: integration tests run the REAL Supabase client against a
// real database, so we must guarantee they can NEVER run against production.

/** True if the URL points at a local stack (the Docker sandbox), which can never be production. */
export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

export interface IntegrationTargetContext {
  /** VITE_SUPABASE_URL the tests will connect to. */
  targetUrl: string;
  /** EXPECTED_SUPABASE_PROJECT_REF — a public allow-list value (CI, optionally local). '' if unset. */
  expectedRef: string;
  /** Whether we're running in CI (process.env.CI). */
  isCI: boolean;
  /** VITE_SUPABASE_URL from .env (production). Used only for the local no-ref check. '' if unknown. */
  prodUrl: string;
}

/**
 * Throws if the target could be production; returns normally if it's safe.
 *
 *   1. A localhost / 127.0.0.1 target is ALWAYS safe (the local Docker stack
 *      can't be production) — allowed regardless of ref/CI.
 *   2. Otherwise, if an expected ref is configured, the target URL MUST contain
 *      it (positive allow-list — the primary CI guard).
 *   3. In CI with no expected ref, we can't verify the target, so FAIL CLOSED.
 *   4. Locally with no expected ref, refuse only if the target equals the prod
 *      URL from .env.
 */
export function assertSafeIntegrationTarget(ctx: IntegrationTargetContext): void {
  const { targetUrl, expectedRef, isCI, prodUrl } = ctx;

  // (1) Local Docker sandbox — definitionally not production.
  if (isLocalSupabaseUrl(targetUrl)) return;

  // (2) Positive allow-list.
  if (expectedRef) {
    if (!targetUrl.includes(expectedRef)) {
      throw new Error(
        `Refusing: integration-test target (${targetUrl}) is not the expected project (EXPECTED_SUPABASE_PROJECT_REF=${expectedRef}).`,
      );
    }
    return;
  }

  // (3) CI with nothing to verify against — fail closed.
  if (isCI) {
    throw new Error(
      "Refusing: in CI you must set the SUPABASE_TEST_PROJECT_REF variable (passed as EXPECTED_SUPABASE_PROJECT_REF) so the integration-test target can be verified as non-production.",
    );
  }

  // (4) Local, no expected ref — refuse only the known prod URL.
  if (prodUrl && targetUrl === prodUrl) {
    throw new Error(
      "Refusing to run integration tests against the production Supabase project (it matches VITE_SUPABASE_URL in .env). Point .env.local / .env.test at the local stack or the test project.",
    );
  }
}
