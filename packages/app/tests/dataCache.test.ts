import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataCache, MAX_ENTRIES, PREFETCH_LIFETIME } from "../src/dataCache";
import type { LoaderContext } from "../src/types";

function context(pathname = "/"): LoaderContext {
  return {
    pathname,
    url: pathname,
    params: {},
    searchParams: new URLSearchParams(),
  };
}

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("DataCache.invalidate", () => {
  it("clears only the entries matching a prefix", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => {
      calls++;
      return calls;
    };

    // Cache three keys under two prefixes (revalidate keeps them cached).
    await cache.load("user|/a", loader, context("/a"), 60);
    await cache.load("user|/b", loader, context("/b"), 60);
    await cache.load("post|/c", loader, context("/c"), 60);
    expect(calls).toBe(3);

    cache.invalidate("user|");

    // The "user|" entries were dropped (loader re-runs) ...
    await cache.load("user|/a", loader, context("/a"), 60);
    await cache.load("user|/b", loader, context("/b"), 60);
    // ... but the "post|" entry survived (still served from cache).
    await cache.load("post|/c", loader, context("/c"), 60);
    expect(calls).toBe(5);
  });

  it("clears every entry when no prefix is given", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => ++calls;
    await cache.load("user|/a", loader, context("/a"), 60);
    await cache.load("post|/c", loader, context("/c"), 60);
    expect(calls).toBe(2);

    cache.invalidate();

    await cache.load("user|/a", loader, context("/a"), 60);
    await cache.load("post|/c", loader, context("/c"), 60);
    expect(calls).toBe(4);
  });

  it("drops queued revalidation thunks for the invalidated keys", async () => {
    vi.useFakeTimers();
    try {
      const cache = new DataCache();
      let calls = 0;
      const loader = () => ++calls;

      // Cache two keys under two prefixes with a 0.01s lifetime.
      await cache.load("user|/a", loader, context("/a"), 0.01);
      await cache.load("post|/b", loader, context("/b"), 0.01);
      expect(calls).toBe(2);

      // Age both entries past their lifetime; the next loads serve stale and
      // queue background revalidation thunks.
      vi.advanceTimersByTime(50);
      await cache.load("user|/a", loader, context("/a"), 0.01);
      await cache.load("post|/b", loader, context("/b"), 0.01);
      expect(calls).toBe(2);

      // Invalidating "user|" must drop its queued thunk; "post|" survives.
      cache.invalidate("user|");
      cache.flushRevalidations();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toBe(3); // only "post|/b" refetched

      // The invalidated key refetches on the next load, not from a stale thunk.
      await cache.load("user|/a", loader, context("/a"), 0.01);
      expect(calls).toBe(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops inflight so a later load does not reuse the old promise", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => {
      calls++;
      const value = `v${calls}`;
      return new Promise((resolve) => setTimeout(() => resolve(value), 20));
    };

    const first = cache.load("k|/", loader, context(), undefined);
    cache.invalidate();
    const second = cache.load("k|/", loader, context(), undefined);

    const [firstValue, secondValue] = await Promise.all([first, second]);
    expect(calls).toBe(2);
    expect(firstValue).toBe("v1");
    expect(secondValue).toBe("v2");
  });

  it("drops prefix-matching inflight so a later load does not reuse", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => {
      calls++;
      return new Promise((resolve) =>
        setTimeout(() => resolve(`v${calls}`), 20),
      );
    };

    const first = cache.load("user|/a", loader, context("/a"), undefined);
    cache.invalidate("user|");
    const second = cache.load("user|/a", loader, context("/a"), undefined);

    await Promise.all([first, second]);
    expect(calls).toBe(2);
  });

  it("drops every queued revalidation thunk when no prefix is given", async () => {
    vi.useFakeTimers();
    try {
      const cache = new DataCache();
      let calls = 0;
      const loader = () => ++calls;

      await cache.load("user|/a", loader, context("/a"), 0.01);
      vi.advanceTimersByTime(50);
      await cache.load("user|/a", loader, context("/a"), 0.01);
      expect(calls).toBe(1);

      // router.refresh() shape: invalidate() then flush — the queued thunk
      // captured a pre-invalidation loader/context and must not fire.
      cache.invalidate();
      cache.flushRevalidations();
      await vi.advanceTimersByTimeAsync(0);
      expect(calls).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("DataCache stale-while-revalidate failure", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the stale entry when the background revalidation fails", async () => {
    const cache = new DataCache();
    let attempt = 0;
    const loader = () => {
      attempt++;
      if (attempt === 1) return "fresh";
      // Reject asynchronously, the realistic shape of a failed background
      // refetch; the cache swallows it and keeps the stale entry.
      return Promise.reject(new Error("revalidation failed"));
    };

    // First load caches "fresh" with a 0.01s lifetime.
    const first = await cache.load("k|/", loader, context(), 0.01);
    expect(first).toBe("fresh");

    // Age the entry past its lifetime.
    vi.advanceTimersByTime(50);

    // Second load serves the stale value immediately and queues a refetch.
    const stale = await cache.load("k|/", loader, context(), 0.01);
    expect(stale).toBe("fresh");

    // Fire the queued background refetch, which throws.
    cache.flushRevalidations();
    // Let the (rejected) loader promise settle.
    await vi.advanceTimersByTimeAsync(0);
    expect(attempt).toBe(2);

    // The failed revalidation must not evict the entry; the stale value remains.
    const after = await cache.load("k|/", loader, context(), 0.01);
    expect(after).toBe("fresh");
  });
});

describe("DataCache.prefetch concurrency", () => {
  it("dedupes two concurrent prefetches for the same key", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => {
      calls++;
      return new Promise((resolve) =>
        setTimeout(() => resolve(`v${calls}`), 10),
      );
    };

    // Two prefetches launched before either loader settles.
    const a = cache.prefetch("k|/", loader, context(), undefined);
    const b = cache.prefetch("k|/", loader, context(), undefined);
    await Promise.all([a, b]);

    // The loader ran once; the second prefetch awaited the first's promise.
    expect(calls).toBe(1);
  });

  it("a concurrent prefetch and load share one loader invocation", async () => {
    const cache = new DataCache();
    let calls = 0;
    const loader = () => {
      calls++;
      return new Promise((resolve) => setTimeout(() => resolve("data"), 10));
    };

    const prefetch = cache.prefetch("k|/", loader, context(), undefined);
    const load = cache.load("k|/", loader, context(), undefined);
    await Promise.all([prefetch, load]);

    expect(calls).toBe(1);
    await tick();
  });
});

describe("DataCache retention", () => {
  // The cache's own rule: a consumable entry (SSR seed / prefetch without
  // `revalidate`) is only served inside PREFETCH_LIFETIME, so past that window
  // nothing can ever read it again and holding it is pure leak — one dead entry
  // per link on a page that prefetches a long list.
  it("releases a prefetched entry once it is past the window it can be served in", async () => {
    vi.useFakeTimers();
    try {
      const cache = new DataCache();
      const entries = (cache as unknown as { entries: Map<string, unknown> })
        .entries;
      let calls = 0;
      const loader = () => ++calls;

      await cache.prefetch("page|/never-visited", loader, context(), undefined);
      expect(entries.size).toBe(1);

      vi.setSystemTime(Date.now() + PREFETCH_LIFETIME + 1);
      // Any later write sweeps it; the loader re-runs, as it already did before.
      await cache.prefetch("page|/other", loader, context(), undefined);
      expect([...entries.keys()]).toEqual(["page|/other"]);
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  // The `revalidate` contract (docs/app/data-loading): a cached entry is served
  // without re-running the loader for `revalidate` seconds. An SSR seed is such
  // an entry for a route that declares one, so retention must not expire it at
  // the (much shorter) prefetch window.
  it("serves an SSR seed for the whole revalidate window of its route", async () => {
    vi.useFakeTimers();
    try {
      const cache = new DataCache();
      let calls = 0;
      const loader = () => ++calls;
      cache.seed({ "page|/dashboard": "from-ssr" });

      // A write for an unrelated key 35s later must not evict the seed.
      vi.setSystemTime(Date.now() + PREFETCH_LIFETIME + 5_000);
      await cache.load("page|/other", loader, context(), 60);

      vi.setSystemTime(Date.now() + 5_000);
      expect(await cache.load("page|/dashboard", loader, context(), 300)).toBe(
        "from-ssr",
      );
      expect(calls).toBe(1); // only the unrelated loader ran
    } finally {
      vi.useRealTimers();
    }
  });

  // The LRU invariant (independent of this cache's implementation: given a
  // sequence of touches, the entry evicted on overflow is always the one
  // least-recently touched) is what bounds `revalidate > 0` routes and
  // unconsumed SSR seeds visited under many distinct search strings — `isDead`
  // cannot age either out (see its comment), so without a count cap the cache
  // grows one entry per distinct string for the life of the page.
  it("evicts the least-recently-touched entry once the count exceeds MAX_ENTRIES (LRU invariant)", async () => {
    const cache = new DataCache();
    const entries = (cache as unknown as { entries: Map<string, unknown> })
      .entries;
    const loader = () => "value";

    for (let index = 0; index < MAX_ENTRIES; index++) {
      await cache.load(`seg|/${index}`, loader, context(), 60);
    }
    expect(entries.size).toBe(MAX_ENTRIES);

    // Touch every key but the first (LRU), then write one more distinct key —
    // by the LRU invariant, key 0 is the only candidate for eviction.
    for (let index = 1; index < MAX_ENTRIES; index++) {
      await cache.load(`seg|/${index}`, loader, context(), 60);
    }
    await cache.load("seg|/overflow", loader, context(), 60);

    expect(entries.size).toBe(MAX_ENTRIES);
    expect(entries.has("seg|/0")).toBe(false);
    expect(entries.has("seg|/1")).toBe(true);
    expect(entries.has("seg|/overflow")).toBe(true);
  });
});
