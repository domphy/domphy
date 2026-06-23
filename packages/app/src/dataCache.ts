import { Notifier } from "@domphy/core";
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
  private notifier = new Notifier();
  /** Stale entries served this render, queued for background refetch after commit. */
  private pending = new Map<string, () => void>();

  /**
   * Subscribes to background revalidation. Fires with the entry key once a
   * stale-while-revalidate refetch lands fresh data, so the router can re-render
   * the route that served the stale value.
   */
  onRevalidated(callback: (key: string) => void): () => void {
    return this.notifier.addListener("revalidated", callback);
  }

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
      // Stale-while-revalidate: a cached (revalidate > 0) entry that aged out is
      // served immediately and queued for a background refetch. The refetch is
      // deferred until `flushRevalidations()` (called after the current render
      // commits) so `onRevalidated` fires against the committed route.
      if (revalidate !== undefined && revalidate > 0) {
        this.pending.set(key, () => this.revalidate(key, loader, context));
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

  /** Starts the background refetch for every stale entry served by the last render. */
  flushRevalidations(): void {
    if (this.pending.size === 0) return;
    const thunks = [...this.pending.values()];
    this.pending.clear();
    for (const thunk of thunks) thunk();
  }

  /** Background refetch for stale-while-revalidate; updates the entry and notifies on success. */
  private revalidate(
    key: string,
    loader: Loader,
    context: LoaderContext,
  ): void {
    if (this.inflight.has(key)) return;
    const promise = Promise.resolve(loader(context)).then(
      (data) => {
        this.inflight.delete(key);
        this.entries.set(key, {
          data,
          timestamp: Date.now(),
          consumable: false,
        });
        this.notifier.notify("revalidated", key);
        return data;
      },
      (error) => {
        // Keep the stale entry on failure; revalidation errors are silent.
        this.inflight.delete(key);
        throw error;
      },
    );
    // Swallow rejection here so the background refetch never becomes an
    // unhandled rejection; the stale entry simply remains.
    promise.catch(() => {});
    this.inflight.set(key, promise);
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
    const pending = this.inflight.get(key);
    if (pending) {
      await pending;
      return;
    }
    // Track the loader call in `inflight` so two concurrent prefetches for the
    // same key (and a concurrent `load()`) share one loader invocation.
    const promise = Promise.resolve(loader(context)).then(
      (data) => {
        this.inflight.delete(key);
        this.entries.set(key, {
          data,
          timestamp: Date.now(),
          consumable: true,
        });
        return data;
      },
      (error) => {
        this.inflight.delete(key);
        throw error;
      },
    );
    this.inflight.set(key, promise);
    await promise;
  }
}
