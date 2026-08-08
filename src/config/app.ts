export const APP_CONFIG = {
  // Keep appName in sync with APP_NAME in supabase/functions/_shared/app.ts
  // (separate runtimes — they cannot share one file).
  appName: 'Learn Ivrit',
  supportEmail: 'contact@learn-ivrit.com',
  /** Max concurrent translation paragraph requests */
  translationMaxConcurrency: 3,
  /** Per-article hourly rate limit for translations */
  translationHourlyLimit: 30,
  /** Per-article daily rate limit for translations */
  translationDailyLimit: 100,
  /** Set to true to skip the sefaria_cache lookup and always re-fetch from the edge function */
  urlCacheDisabled: false,
};
