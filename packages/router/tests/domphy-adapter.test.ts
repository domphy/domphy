import { describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  getStoreFactory,
} from "../src/index";
import { setupTransitioner } from "../src/domphy/transitioner";
import type { AnyRouter } from "../src/router";

function createTestSetup() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const postRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/posts/$postId",
    loader: ({ params }) => ({ title: `Post ${params.postId}` }),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, postRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return { router, postRoute };
}

// Wraps a store's `subscribe` so that the unsubscribe handle the transitioner
// receives is spied. The store atoms return `{ unsubscribe }`. Only calls made
// after wrapping are captured (the router's own auto-transitioner subscribed
// earlier through the unwrapped method).
function spyStoreUnsub(store: { subscribe: (cb: () => void) => unknown }) {
  const spies: Array<ReturnType<typeof vi.fn>> = [];
  const original = store.subscribe.bind(store);
  store.subscribe = (cb: () => void) => {
    const handle = original(cb) as { unsubscribe: () => void };
    const spy = vi.fn(() => handle.unsubscribe());
    spies.push(spy);
    return { unsubscribe: spy };
  };
  return spies;
}

describe("setupTransitioner cleanup", () => {
  it("unsubscribes the isLoading, hasPending and history subscriptions on cleanup", async () => {
    const { router } = createTestSetup();
    await router.load();

    const isLoadingUnsubs = spyStoreUnsub(router.stores.isLoading as never);
    const hasPendingUnsubs = spyStoreUnsub(router.stores.hasPending as never);

    // The history Set dedupes by reference and both transitioners subscribe
    // the same `router.load`, so the subscriber-count is not observable. Spy
    // on the unsubscribe handle the transitioner is handed instead.
    const historyUnsub = vi.fn();
    const originalHistorySubscribe = router.history.subscribe.bind(
      router.history,
    );
    router.history.subscribe = (cb: () => void) => {
      const realUnsub = originalHistorySubscribe(cb);
      return () => {
        historyUnsub();
        realUnsub();
      };
    };

    const cleanup = setupTransitioner(router as unknown as AnyRouter);

    // Exactly one subscription per store and one for history were created.
    expect(isLoadingUnsubs.length).toBe(1);
    expect(hasPendingUnsubs.length).toBe(1);
    expect(historyUnsub).not.toHaveBeenCalled();

    cleanup();

    expect(isLoadingUnsubs[0]).toHaveBeenCalledTimes(1);
    expect(hasPendingUnsubs[0]).toHaveBeenCalledTimes(1);
    expect(historyUnsub).toHaveBeenCalledTimes(1);
  });

  it("stops driving the transitioner update after cleanup (store notifications detached)", async () => {
    const { router } = createTestSetup();
    await router.load();

    // Capture the `update` callback the transitioner registers on isLoading,
    // and a spy unsubscribe that flips a flag when invoked.
    let registeredUpdate: (() => void) | null = null;
    let unsubscribed = false;
    const originalSubscribe = router.stores.isLoading.subscribe.bind(
      router.stores.isLoading,
    );
    (router.stores.isLoading as never as {
      subscribe: (cb: () => void) => unknown;
    }).subscribe = (cb: () => void) => {
      registeredUpdate = cb;
      const handle = originalSubscribe(cb) as { unsubscribe: () => void };
      return {
        unsubscribe: () => {
          unsubscribed = true;
          handle.unsubscribe();
        },
      };
    };

    const cleanup = setupTransitioner(router as unknown as AnyRouter);
    expect(typeof registeredUpdate).toBe("function");
    expect(unsubscribed).toBe(false);

    cleanup();
    expect(unsubscribed).toBe(true);

    // Calling cleanup twice must be safe.
    expect(() => cleanup()).not.toThrow();
  });
});

describe("getStoreFactory branch selection", () => {
  it("returns reactive (subscribable) atoms on the client branch", () => {
    const config = getStoreFactory({ isServer: false });
    const mutable = config.createMutableStore(0);
    const readonly = config.createReadonlyStore(() => 1);

    // @tanstack/store atoms expose subscribe.
    expect(typeof (mutable as unknown as { subscribe?: unknown }).subscribe).toBe(
      "function",
    );
    expect(
      typeof (readonly as unknown as { subscribe?: unknown }).subscribe,
    ).toBe("function");

    // batch is the real @tanstack/store batch (runs the function once).
    let ran = 0;
    config.batch(() => {
      ran++;
    });
    expect(ran).toBe(1);
  });

  it("returns non-reactive stores and a pass-through batch on the server branch", () => {
    const config = getStoreFactory({ isServer: true });
    const mutable = config.createMutableStore(0);
    const readonly = config.createReadonlyStore(() => 42);

    // Non-reactive stores have no subscribe method.
    expect(
      (mutable as unknown as { subscribe?: unknown }).subscribe,
    ).toBeUndefined();
    expect(
      (readonly as unknown as { subscribe?: unknown }).subscribe,
    ).toBeUndefined();

    // Functional + value updates still work on the mutable store.
    expect(mutable.get()).toBe(0);
    mutable.set(5);
    expect(mutable.get()).toBe(5);
    mutable.set((prev) => prev + 1);
    expect(mutable.get()).toBe(6);

    // Readonly store reads through the provided getter.
    expect(readonly.get()).toBe(42);

    // batch is a pass-through that simply invokes the function.
    let ran = 0;
    config.batch(() => {
      ran++;
    });
    expect(ran).toBe(1);
  });
});
