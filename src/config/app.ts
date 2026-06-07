export const APP_CONFIG = {
  appName: 'Learn Ivrit',
  supportEmail: 'support@yourapp.com',
  /** Max concurrent translation paragraph requests */
  translationMaxConcurrency: 3,
  /** Per-article hourly rate limit for translations */
  translationHourlyLimit: 30,
  /** Per-article daily rate limit for translations */
  translationDailyLimit: 100,
  /** Set to true to skip the sefaria_cache lookup and always re-fetch from the edge function */
  urlCacheDisabled: false,
};
