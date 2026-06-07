/**
 * サーバーレスインスタンス内 TTL キャッシュ。
 * Netlify ではインスタンスごとに保持されるが、同一インスタンスへの連続リクエストで DB 往復を省略できる。
 */
type CacheEntry<T> = { expiresAt: number; value: T };

const store = new Map<string, CacheEntry<unknown>>();

export function orgCacheKey(
  organizationId: string,
  resource: string,
  suffix?: string,
): string {
  return suffix
    ? `org:${organizationId}:${resource}:${suffix}`
    : `org:${organizationId}:${resource}`;
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function getOrSetCached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  setCached(key, value, ttlMs);
  return value;
}

/** メモリキャッシュ TTL */
export const MEMORY_TTL = {
  master: 5 * 60 * 1000,
  catalog: 60 * 1000,
  settings: 2 * 60 * 1000,
  /** 管理画面一覧（短め: 更新後も最大30秒で反映） */
  adminList: 30 * 1000,
  /** ダッシュボード集計 */
  dashboard: 45 * 1000,
} as const;

/** 組織単位でキャッシュを無効化（mutation 後に呼ぶ） */
export function invalidateOrgCache(organizationId: string, resource?: string): void {
  const prefix = resource
    ? `org:${organizationId}:${resource}`
    : `org:${organizationId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
