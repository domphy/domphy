import { Notifier } from "@domphy/core";
import type { Loader, LoaderContext } from "./types.js";

interface CacheEntry {
  data: unknown;
  timestamp: number;
  /** Entries seeded from SSR or prefetch are consumed once even by uncached loaders. */
  consumable: boolean;
  /** Written by `prefetch()` for a route without `revalidate`, see `isDead`. */
  prefetched?: boolean;
}

/**
 * An entry that can no longer satisfy a `load()`. `prefetch()` only writes one
 * for a route without `revalidate`, and `load()` serves such an entry solely
 * through `usableSeed`, i.e. inside the prefetch window — so once it is past
 * that and still unconsumed nothing will ever read it again, and nothing used
 * to remove it either: a page prefetching a long list of links
 * (`prefetch: "visible"`) retained one dead entry, loader payload included,
 * per link for the life of the session.
 *
 * Nothing else is dead by this rule. A `revalidate` entry is served by
 * stale-while-revalidate at any age, and a `seed()` entry belongs to a route
 * whose `revalidate` the cache does not know here — both are still served
 * through `fresh`/`usableSeed` for the whole of that window, which can be far
 * longer, so no age-based rule can drop either. `setEntry` backstops that
 * case with a count-bounded LRU sweep (see `MAX_ENTRIES`).
 */
function isDead(entry: CacheEntry, now: number): boolean {
  return entry.prefetched === true && now - entry.timestamp > PREFETCH_LIFETIME;
}

/** How long a prefetched entry stays usable, mirrors the Next.js client router cache. */
export const PREFETCH_LIFETIME = 30_000;

/**
 * Hard cap on distinct cache keys, enforced by evicting the least-recently-
 * touched entry (Map insertion order, moved to the end on every read/write —
 * the LRU invariant) once the count is exceeded. Backstops `revalidate > 0`
 * routes and unconsumed SSR seeds visited under many distinct search
 * strings, which `isDead` cannot age out (see its comment) and would
 * otherwise grow one entry per string for the life of the page.
 *
 * INHERITED: same order of magnitude as this repo's own per-distinct-string
 * cache for the same class of problem — packages/router/src/router.ts:1400,
 * `createSieveCache(1000)` for TanStack Router's path-resolution cache.
 */
export const MAX_ENTRIES = 1000;

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

  /**
   * Writes an entry (as the most-recently-used), drops the ones that can no
   * longer be served (see `isDead`), then evicts least-recently-used entries
   * until the cache is back under `MAX_ENTRIES`.
   */
  private setEntry(key: string, entry: CacheEntry): void {
    this.touch(key, entry);
    const now = entry.timestamp;
    for (const [existing, candidate] of this.entries) {
      if (isDead(candidate, now)) this.entries.delete(existing);
    }
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  /**
   * Moves `key` to the most-recently-used end of `entries` (Map re-insertion
   * order — a plain `.set()` on an existing key does NOT reorder it). Called
   * on every write and every read hit, so `setEntry`'s LRU sweep evicts the
   * entry that has gone longest untouched.
   */
  private touch(key: string, entry: CacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  /** Seeds entries (from SSR payloads) that satisfy the next load exactly once. */
  seed(record: Record<string, unknown>): void {
    for (const key of Object.keys(record)) {
      this.setEntry(key, {
        data: record[key],
        timestamp: Date.now(),
        consumable: true,
      });
    }
  }

  invalidate(prefix?: string): void {
    if (prefix === undefined) {
      this.entries.clear();
      this.pending.clear();
      this.inflight.clear();
      return;
    }
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
    // Drop queued background revalidations for the invalidated keys too: a
    // queued thunk captured the pre-invalidation loader/context and would
    // otherwise refetch once into the just-cleared key (one redundant fetch
    // plus a spurious onRevalidated render).
    for (const key of this.pending.keys()) {
      if (key.startsWith(prefix)) this.pending.delete(key);
    }
    // Drop in-flight promises so a later load() does not reuse a loader
    // invocation that started before this invalidation.
    for (const key of this.inflight.keys()) {
      if (key.startsWith(prefix)) this.inflight.delete(key);
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
        else this.touch(key, entry);
        return entry.data;
      }
      // Stale-while-revalidate: a cached (revalidate > 0) entry that aged out is
      // served immediately and queued for a background refetch. The refetch is
      // deferred until `flushRevalidations()` (called after the current render
      // commits) so `onRevalidated` fires against the committed route.
      if (revalidate !== undefined && revalidate > 0) {
        this.touch(key, entry);
        this.pending.set(key, () => this.revalidate(key, loader, context));
        return entry.data;
      }
      this.entries.delete(key);
    }

    const pending = this.inflight.get(key);
    if (pending) return pending;

    const promise = Promise.resolve(loader(context)).then(
      (data) => {
        // Skip write-back when invalidate() dropped this promise — a later
        // load must not inherit the pre-invalidation result or its cache entry.
        if (this.inflight.get(key) === promise) {
          this.inflight.delete(key);
          if (revalidate !== undefined && revalidate > 0) {
            this.setEntry(key, {
              data,
              timestamp: Date.now(),
              consumable: false,
            });
          }
        }
        return data;
      },
      (error) => {
        if (this.inflight.get(key) === promise) this.inflight.delete(key);
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
        this.setEntry(key, {
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
        if (this.inflight.get(key) === promise) {
          this.inflight.delete(key);
          this.setEntry(key, {
            data,
            timestamp: Date.now(),
            consumable: true,
            prefetched: true,
          });
        }
        return data;
      },
      (error) => {
        if (this.inflight.get(key) === promise) this.inflight.delete(key);
        throw error;
      },
    );
    this.inflight.set(key, promise);
    await promise;
  }
}
