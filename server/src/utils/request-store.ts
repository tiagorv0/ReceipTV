import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: number;
  ip?: string;
  userAgent?: string;
}

export const requestStorage = new AsyncLocalStorage<RequestStore>();

export function getStore(): RequestStore | undefined {
  return requestStorage.getStore();
}

export function runWithStore<T>(store: RequestStore, fn: () => T): T {
  return requestStorage.run(store, fn);
}
