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
  /** EXPECTED_SUPABASE_PROJECT_REF — the CI allow-list value. '' when running locally. */
  expectedRef: string;
  /** Whether we're running in CI (process.env.CI). */
  isCI: boolean;
}

/**
 * Throws if the target could be production; returns normally if it's safe.
 *
 *   1. A localhost / 127.0.0.1 target is ALWAYS safe (the local Docker sandbox
 *      can't be production) — this is the only target local runs allow.
 *   2. In CI, an expected ref must be configured and the target URL MUST contain
 *      it (positive allow-list — the remote TEST project).
 *   3. In CI with no expected ref, we can't verify the target, so FAIL CLOSED.
 *   4. Locally, any non-localhost target is refused: local integration tests run
 *      only against the Docker sandbox. Remote targets are a CI-only path, so no
 *      production URL ever needs to be referenced here.
 */
export function assertSafeIntegrationTarget(ctx: IntegrationTargetContext): void {
  const { targetUrl, expectedRef, isCI } = ctx;

  // (1) Local Docker sandbox — definitionally not production.
  if (isLocalSupabaseUrl(targetUrl)) return;

  // (2) CI positive allow-list.
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

  // (4) Local with a non-localhost target — refuse. Local integration tests run
  //     only against the Docker sandbox.
  throw new Error(
    `Refusing: local integration tests must target the local Docker sandbox (http://127.0.0.1:54321), but got ${targetUrl}. Run \`npm run sandbox:start\`. Remote targets are a CI-only path (set EXPECTED_SUPABASE_PROJECT_REF there).`,
  );
}
