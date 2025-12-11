import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestDeduplicator, createRequestKey } from './requestDeduplicator';

describe('createRequestKey', () => {
  it('returns endpoint when no params provided', () => {
    expect(createRequestKey('/api/test')).toBe('/api/test');
  });

  it('returns endpoint when params is undefined', () => {
    expect(createRequestKey('/api/test', undefined)).toBe('/api/test');
  });

  it('appends JSON stringified params to endpoint', () => {
    const params = { id: 1, name: 'test' };
    expect(createRequestKey('/api/test', params)).toBe('/api/test-{"id":1,"name":"test"}');
  });

  it('creates different keys for different params', () => {
    const key1 = createRequestKey('/api/test', { id: 1 });
    const key2 = createRequestKey('/api/test', { id: 2 });
    expect(key1).not.toBe(key2);
  });

  it('creates same key for same params in different order', () => {
    const key1 = createRequestKey('/api/test', { a: 1, b: 2 });
    const key2 = createRequestKey('/api/test', { a: 1, b: 2 });
    expect(key1).toBe(key2);
  });
});

describe('RequestDeduplicator', () => {
  beforeEach(() => {
    requestDeduplicator.clear();
  });

  it('executes request and returns result', async () => {
    const requestFn = vi.fn().mockResolvedValue('success');

    const result = await requestDeduplicator.dedupe('key1', requestFn);

    expect(result).toBe('success');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent requests with same key', async () => {
    let callCount = 0;
    const requestFn = vi.fn().mockImplementation(() =>
      new Promise(resolve => {
        callCount++;
        setTimeout(() => resolve('success'), 50);
      })
    );

    const promise1 = requestDeduplicator.dedupe('key1', requestFn);
    const promise2 = requestDeduplicator.dedupe('key1', requestFn);
    const promise3 = requestDeduplicator.dedupe('key1', requestFn);

    expect(callCount).toBe(1);

    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).toBe('success');
    expect(result2).toBe('success');
    expect(result3).toBe('success');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('allows different keys to execute independently', async () => {
    const requestFn1 = vi.fn().mockResolvedValue('result1');
    const requestFn2 = vi.fn().mockResolvedValue('result2');

    const promise1 = requestDeduplicator.dedupe('key1', requestFn1);
    const promise2 = requestDeduplicator.dedupe('key2', requestFn2);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(requestFn1).toHaveBeenCalledTimes(1);
    expect(requestFn2).toHaveBeenCalledTimes(1);
  });

  it('cleans up after request completes', async () => {
    const requestFn = vi.fn().mockResolvedValue('success');

    await requestDeduplicator.dedupe('key1', requestFn);

    const secondRequestFn = vi.fn().mockResolvedValue('second call');
    await requestDeduplicator.dedupe('key1', secondRequestFn);

    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(secondRequestFn).toHaveBeenCalledTimes(1);
  });

  it('cleans up even when request fails', async () => {
    const error = new Error('Request failed');
    const requestFn = vi.fn().mockRejectedValue(error);

    await expect(requestDeduplicator.dedupe('key1', requestFn)).rejects.toThrow('Request failed');

    const secondRequestFn = vi.fn().mockResolvedValue('success');
    const result = await requestDeduplicator.dedupe('key1', secondRequestFn);

    expect(result).toBe('success');
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(secondRequestFn).toHaveBeenCalledTimes(1);
  });

  it('propagates errors to all waiting callers', async () => {
    const error = new Error('Request failed');
    const requestFn = vi.fn().mockRejectedValue(error);

    const promise1 = requestDeduplicator.dedupe('key1', requestFn);
    const promise2 = requestDeduplicator.dedupe('key1', requestFn);
    const promise3 = requestDeduplicator.dedupe('key1', requestFn);

    await expect(promise1).rejects.toThrow('Request failed');
    await expect(promise2).rejects.toThrow('Request failed');
    await expect(promise3).rejects.toThrow('Request failed');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('handles async request functions', async () => {
    const requestFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'async result';
    });

    const promise = requestDeduplicator.dedupe('key1', requestFn);
    const result = await promise;

    expect(result).toBe('async result');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('clears all in-flight requests', async () => {
    const requestFn1 = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('result1'), 1000))
    );
    const requestFn2 = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('result2'), 1000))
    );

    requestDeduplicator.dedupe('key1', requestFn1);
    requestDeduplicator.dedupe('key2', requestFn2);

    requestDeduplicator.clear();

    const newRequestFn = vi.fn().mockResolvedValue('new result');
    const result = await requestDeduplicator.dedupe('key1', newRequestFn);

    expect(result).toBe('new result');
    expect(newRequestFn).toHaveBeenCalledTimes(1);
  });

  it('handles requests that resolve to different types', async () => {
    const stringRequest = vi.fn().mockResolvedValue('string result');
    const numberRequest = vi.fn().mockResolvedValue(42);
    const objectRequest = vi.fn().mockResolvedValue({ data: 'test' });

    const result1 = await requestDeduplicator.dedupe('key1', stringRequest);
    const result2 = await requestDeduplicator.dedupe('key2', numberRequest);
    const result3 = await requestDeduplicator.dedupe('key3', objectRequest);

    expect(result1).toBe('string result');
    expect(result2).toBe(42);
    expect(result3).toEqual({ data: 'test' });
  });

  it('allows new request after previous completes even with same function', async () => {
    const requestFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const result1 = await requestDeduplicator.dedupe('key1', requestFn);
    const result2 = await requestDeduplicator.dedupe('key1', requestFn);

    expect(result1).toBe('first');
    expect(result2).toBe('second');
    expect(requestFn).toHaveBeenCalledTimes(2);
  });
});
