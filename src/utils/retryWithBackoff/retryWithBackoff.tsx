/**
 * Determines if an error is retryable (5xx or network error)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  // Network errors (no response)
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String(error.message);
    if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      return true;
    }
  }

  // Supabase/HTTP status codes
  const status = error && typeof error === 'object' && ('status' in error ? error.status : 'statusCode' in error ? error.statusCode : undefined);
  if (status && typeof status === 'number' && status >= 500 && status < 600) {
    return true;
  }

  // Check for common 5xx error messages
  const message = (error && typeof error === 'object' && 'message' in error ? String(error.message) : '').toLowerCase();
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

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
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

      const errorMessage = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error';
      console.warn(`Retryable error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms:`, errorMessage);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
