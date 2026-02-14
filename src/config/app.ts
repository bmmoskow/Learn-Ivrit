export const APP_CONFIG = {
  appName: 'Learn Ivrit',
  supportEmail: 'support@yourapp.com',
  /** Max characters per translation chunk. Tunes the tradeoff between fewer API calls vs faster individual responses. */
  translationChunkSize: 3000,
  /** Max concurrent translation chunk requests */
  translationMaxConcurrency: 3,
};
