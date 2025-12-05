import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetryableError, retryWithBackoff } from './retryWithBackoff';

describe('isRetryableError', () => {
  it('returns false for null/undefined', () => {
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });

  it('returns true for 5xx status codes', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 502 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
    expect(isRetryableError({ statusCode: 504 })).toBe(true);
  });

  it('returns false for 4xx status codes', () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 403 })).toBe(false);
    expect(isRetryableError({ status: 404 })).toBe(false);
  });

  it('returns true for network error messages', () => {
    expect(isRetryableError({ message: 'fetch failed' })).toBe(true);
    expect(isRetryableError({ message: 'network error' })).toBe(true);
  });

  it('returns true for 5xx error messages', () => {
    expect(isRetryableError({ message: 'Internal Server Error' })).toBe(true);
    expect(isRetryableError({ message: 'Service Unavailable' })).toBe(true);
    expect(isRetryableError({ message: 'Bad Gateway' })).toBe(true);
    expect(isRetryableError({ message: 'Gateway Timeout' })).toBe(true);
  });

  it('returns false for auth error messages', () => {
    expect(isRetryableError({ message: 'Invalid credentials' })).toBe(false);
    expect(isRetryableError({ message: 'User not found' })).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401, message: 'Unauthorized' });

    await expect(retryWithBackoff(fn)).rejects.toEqual({ status: 401, message: 'Unauthorized' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx errors and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Server error' })
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { initialDelayMs: 100 });

    // First call fails immediately
    await vi.advanceTimersByTimeAsync(0);

    // Wait for retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('gives up after max retries', async () => {
    const serverError = { status: 503, message: 'Service Unavailable' };
    const fn = vi.fn().mockRejectedValue(serverError);

    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 100 });

    // Advance through all retry attempts and catch the rejection
    let caughtError: unknown;
    promise.catch((e) => { caughtError = e; });

    await vi.advanceTimersByTimeAsync(10000);
    await vi.runAllTimersAsync();

    expect(caughtError).toEqual(serverError);
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});
