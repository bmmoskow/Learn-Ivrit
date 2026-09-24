import "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Setup for INTEGRATION tests (*.integrationtest.tsx). Unlike ./setup.ts, this
// deliberately does NOT override the Supabase env vars and does NOT mock the
// Supabase client — integration tests run against the REAL test project, with
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY supplied from .env.test.

// Minimal Deno shim so any edge-function-shared constants fall through to defaults.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Deno = { env: { get: () => undefined } };

// Radix UI polyfills so components render under jsdom.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// NOTE: jsdom's real localStorage is left in place so the Supabase client can
// persist auth sessions during a test run.
