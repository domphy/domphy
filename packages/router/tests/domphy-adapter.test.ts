import { describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  getStoreFactory,
  subscribeToRouterState,
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

describe("setupTransitioner cleanup", () => {
  it("unsubscribes the history subscription on cleanup", async () => {
    const { router } = createTestSetup();
    await router.load();

    // The history Set dedupes by reference and both transitioners subscribe
    // the same `router.load`, so the subscriber count is not observable. Spy
    // on the unsubscribe handle the transitioner is handed instead.
    const historyUnsub = vi.fn();
    const originalHistorySubscribe = router.history.subscribe.bind(
      router.history,
    );
    (
      router.history as unknown as {
        subscribe: (cb: () => void) => () => void;
      }
    ).subscribe = (cb: () => void) => {
      const realUnsub = originalHistorySubscribe(cb);
      return () => {
        historyUnsub();
        realUnsub();
      };
    };

    const { cleanup } = setupTransitioner(router as unknown as AnyRouter);
    expect(historyUnsub).not.toHaveBeenCalled();

    cleanup();
    expect(historyUnsub).toHaveBeenCalledTimes(1);

    // Calling cleanup twice must be safe and must not unsubscribe twice.
    expect(() => cleanup()).not.toThrow();
    expect(historyUnsub).toHaveBeenCalledTimes(1);
  });

  it("leaves startTransition inert after cleanup (no commit, reports not-rendered)", async () => {
    const { router } = createTestSetup();
    await router.load();

    const { cleanup } = setupTransitioner(router as unknown as AnyRouter);
    cleanup();

    // Core calls startTransition(commit, matches) and only emits onRendered
    // when it resolves true. A torn-down transitioner must neither run the
    // commit nor claim the UI rendered.
    const commit = vi.fn();
    const rendered = await router.startTransition(commit, []);
    expect(commit).not.toHaveBeenCalled();
    expect(rendered).toBe(false);
  });

  it("rebindHistory re-targets the history subscription to the current router.history", async () => {
    const { router, postRoute } = createTestSetup();
    await router.load();

    const { rebindHistory } = setupTransitioner(router as unknown as AnyRouter);

    const oldHistory = router.history;
    const newHistory = createMemoryHistory({ initialEntries: ["/"] });
    (router as unknown as { history: typeof newHistory }).history = newHistory;
    rebindHistory();

    // The stale history's navigation no longer reaches router.load.
    oldHistory.push("/posts/1");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      router.state.matches.find(
        (routeMatch) => routeMatch.routeId === postRoute.id,
      ),
    ).toBeUndefined();

    // The new history's navigation now drives the router.
    newHistory.push("/posts/2");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      router.state.matches.find(
        (routeMatch) => routeMatch.routeId === postRoute.id,
      )?.loaderData,
    ).toEqual({ title: "Post 2" });
  });
});

describe("Router.update() rebinds the transitioner to a replaced history", () => {
  it("reacts to the new history's navigation and stops reacting to the old one", async () => {
    const { router, postRoute } = createTestSetup();
    await router.load();

    const oldHistory = router.history;
    const newHistory = createMemoryHistory({ initialEntries: ["/"] });
    router.update({ ...router.options, history: newHistory });

    oldHistory.push("/posts/1");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      router.state.matches.find(
        (routeMatch) => routeMatch.routeId === postRoute.id,
      ),
    ).toBeUndefined();

    newHistory.push("/posts/2");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      router.state.matches.find(
        (routeMatch) => routeMatch.routeId === postRoute.id,
      )?.loaderData,
    ).toEqual({ title: "Post 2" });
  });
});

describe("Router.destroy()", () => {
  it("stops reacting to history changes after destroy", async () => {
    const { router, postRoute } = createTestSetup();
    await router.load();

    (router as unknown as { destroy: () => void }).destroy();

    router.history.push("/posts/1");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(
      router.state.matches.find(
        (routeMatch) => routeMatch.routeId === postRoute.id,
      ),
    ).toBeUndefined();
  });

  // `startTransition` is a router field the transitioner installs, so it
  // survives cleanup(); without a guard an explicit `load()` on a destroyed
  // router still emitted the lifecycle events and scheduled an onRendered
  // timer that cleanup() could no longer cancel.
  it("emits no lifecycle events when load() is called on a destroyed router", async () => {
    const { router } = createTestSetup();
    await router.load();

    const emitted: Array<string> = [];
    for (const event of ["onLoad", "onResolved", "onRendered"] as const) {
      router.subscribe(event, () => emitted.push(event));
    }

    (router as unknown as { destroy: () => void }).destroy();

    router.history.push("/posts/1");
    await router.load();
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(emitted).toEqual([]);
  });
});

describe("subscribeToRouterState", () => {
  function createSlowSetup() {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const slowRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/slow",
      loader: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { title: "Slow" };
      },
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, slowRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    return { router, slowRoute };
  }

  // Truth source: @tanstack/react-router 1.170.38 `useRouterState` subscribes
  // to `router.stores.__store` (via `useSelector`) and router-core's
  // `RouterState.isLoading` is `status === 'pending'`. A React app renders a
  // spinner from exactly that read, so the headless adapter must publish the
  // same transition.
  it("publishes isLoading true while a loader runs, then false (upstream useRouterState read)", async () => {
    const { router } = createSlowSetup();
    await router.load();

    const seen: Array<boolean> = [];
    const unsubscribe = subscribeToRouterState(router, (state) => {
      seen.push(state.isLoading);
    });

    expect(router.state.isLoading).toBe(false);

    const navigation = router.navigate({ to: "/slow" });
    // Mid-load: the subscription has already reported the pending flip, which
    // no lifecycle event does (onBeforeLoad fires while status is still
    // 'idle', onLoad only after the loaders settle).
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(seen).toContain(true);
    expect(router.state.isLoading).toBe(true);

    await navigation;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(router.state.isLoading).toBe(false);
    expect(seen[seen.length - 1]).toBe(false);

    unsubscribe();
  });

  it("stops reporting after unsubscribe", async () => {
    const { router } = createSlowSetup();
    await router.load();

    let calls = 0;
    const unsubscribe = subscribeToRouterState(router, () => {
      calls++;
    });
    unsubscribe();

    await router.navigate({ to: "/slow" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(0);
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
