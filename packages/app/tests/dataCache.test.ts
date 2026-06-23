import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataCache } from "../src/dataCache";
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
