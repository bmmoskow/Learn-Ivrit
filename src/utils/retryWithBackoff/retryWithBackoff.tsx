/**
 * Determines if an error is retryable (5xx or network error)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors (no response)
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return true;
  }

  // Supabase/HTTP status codes
  const status = error.status || error.statusCode;
  if (status && status >= 500 && status < 600) {
    return true;
  }

  // Check for common 5xx error messages
  const message = error.message?.toLowerCase() || '';
  if (message.includes('internal server error') ||
      message.includes('service unavailable') ||
      message.includes('gateway timeout') ||
      message.includes('bad gateway')) {
    return true;
  }

  return false;
}

/**
 * Executes an async function with exponential backoff retry for 5xx/network errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 500, maxDelayMs = 5000 } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a retryable error or we're out of retries
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        maxDelayMs
      );

      console.warn(`Retryable error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, error.message);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
