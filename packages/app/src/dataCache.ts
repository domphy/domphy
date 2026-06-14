import type { Loader, LoaderContext } from "./types.js";

interface CacheEntry {
  data: unknown;
  timestamp: number;
  /** Entries seeded from SSR or prefetch are consumed once even by uncached loaders. */
  consumable: boolean;
}

/** How long a prefetched entry stays usable, mirrors the Next.js client router cache. */
export const PREFETCH_LIFETIME = 30_000;

/**
 * Loader result cache. The `revalidate` option of a route controls the entry
 * lifetime, the equivalent of fetch caching / ISR in Next.js.
 */
export class DataCache {
  private entries = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<unknown>>();

  /** Seeds entries (from SSR payloads) that satisfy the next load exactly once. */
  seed(record: Record<string, unknown>): void {
    for (const key of Object.keys(record)) {
      this.entries.set(key, {
        data: record[key],
        timestamp: Date.now(),
        consumable: true,
      });
    }
  }

  snapshot(keys: string[]): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    for (const key of keys) {
      const entry = this.entries.get(key);
      if (entry) record[key] = entry.data;
    }
    return record;
  }

  invalidate(prefix?: string): void {
    if (prefix === undefined) {
      this.entries.clear();
      return;
    }
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  async load(
    key: string,
    loader: Loader,
    context: LoaderContext,
    revalidate: number | undefined,
  ): Promise<unknown> {
    const entry = this.entries.get(key);
    if (entry) {
      const lifetime = revalidate !== undefined ? revalidate * 1000 : 0;
      const fresh = Date.now() - entry.timestamp <= lifetime;
      const usableSeed =
        entry.consumable && Date.now() - entry.timestamp <= PREFETCH_LIFETIME;
      if (fresh || usableSeed) {
        if (entry.consumable && !fresh) this.entries.delete(key);
        return entry.data;
      }
      this.entries.delete(key);
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = Promise.resolve(loader(context)).then(
      (data) => {
        this.inflight.delete(key);
        if (revalidate !== undefined && revalidate > 0) {
          this.entries.set(key, {
            data,
            timestamp: Date.now(),
            consumable: false,
          });
        }
        return data;
      },
      (error) => {
        this.inflight.delete(key);
        throw error;
      },
    );
    this.inflight.set(key, promise);
    return promise;
  }

  /** Runs the loader ahead of navigation and stores the result as a one-shot entry. */
  async prefetch(
    key: string,
    loader: Loader,
    context: LoaderContext,
    revalidate: number | undefined,
  ): Promise<void> {
    if (revalidate !== undefined) {
      await this.load(key, loader, context, revalidate);
      return;
    }
    const existing = this.entries.get(key);
    if (existing && Date.now() - existing.timestamp <= PREFETCH_LIFETIME)
      return;
    if (this.inflight.has(key)) return;
    const data = await loader(context);
    this.entries.set(key, { data, timestamp: Date.now(), consumable: true });
  }
}
