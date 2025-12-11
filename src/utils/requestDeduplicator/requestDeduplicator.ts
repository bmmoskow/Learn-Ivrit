type RequestKey = string;

class RequestDeduplicator {
  private inFlightRequests: Map<RequestKey, Promise<any>> = new Map();

  async dedupe<T>(
    key: RequestKey,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = requestFn()
      .finally(() => {
        this.inFlightRequests.delete(key);
      });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.inFlightRequests.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

export function createRequestKey(endpoint: string, params?: Record<string, any>): string {
  return params ? `${endpoint}-${JSON.stringify(params)}` : endpoint;
}
