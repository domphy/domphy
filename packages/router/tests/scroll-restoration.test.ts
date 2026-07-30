import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "../src/index";
import { storageKey } from "../src/scroll-restoration";

function createTestRouter() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/about",
  });
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute, aboutRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    scrollRestoration: true,
  });
}

const liveRouters: Array<{ destroy: () => void }> = [];

function createTrackedRouter() {
  const router = createTestRouter();
  liveRouters.push(router as unknown as { destroy: () => void });
  return router;
}

afterEach(() => {
  while (liveRouters.length) {
    liveRouters.pop()!.destroy();
  }
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("scroll restoration lifecycle", () => {
  it("removes scroll/pagehide listeners and router subscriptions on destroy", () => {
    const addDocumentSpy = vi.spyOn(document, "addEventListener");
    const removeDocumentSpy = vi.spyOn(document, "removeEventListener");
    const addWindowSpy = vi.spyOn(window, "addEventListener");
    const removeWindowSpy = vi.spyOn(window, "removeEventListener");

    const router = createTrackedRouter();

    const scrollHandler = addDocumentSpy.mock.calls.find(
      ([type]) => type === "scroll",
    )?.[1];
    const pageHideHandler = addWindowSpy.mock.calls.find(
      ([type]) => type === "pagehide",
    )?.[1];
    expect(scrollHandler).toBeDefined();
    expect(pageHideHandler).toBeDefined();
    const subscribersBefore = router.subscribers.size;
    expect(subscribersBefore).toBeGreaterThanOrEqual(2);
    expect(history.scrollRestoration).toBe("manual");

    (router as unknown as { destroy: () => void }).destroy();

    expect(
      removeDocumentSpy.mock.calls.some(
        ([type, handler]) => type === "scroll" && handler === scrollHandler,
      ),
    ).toBe(true);
    expect(
      removeWindowSpy.mock.calls.some(
        ([type, handler]) => type === "pagehide" && handler === pageHideHandler,
      ),
    ).toBe(true);
    // onBeforeLoad + onRendered subscriptions are released
    expect(router.subscribers.size).toBe(subscribersBefore - 2);
    // last active router torn down: native scroll restoration is restored
    expect(history.scrollRestoration).toBe("auto");
  });

  it("stops scroll snapshotting after destroy", () => {
    const router = createTrackedRouter();
    (router as unknown as { destroy: () => void }).destroy();

    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("pagehide"));

    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("keeps scroll restoration working for a surviving router when another is destroyed", () => {
    const addDocumentSpy = vi.spyOn(document, "addEventListener");
    const removeDocumentSpy = vi.spyOn(document, "removeEventListener");

    const routerA = createTrackedRouter();
    const handlerA = addDocumentSpy.mock.calls
      .filter(([type]) => type === "scroll")
      .at(-1)?.[1];
    const routerB = createTrackedRouter();
    const handlerB = addDocumentSpy.mock.calls
      .filter(([type]) => type === "scroll")
      .at(-1)?.[1];
    expect(handlerA).toBeDefined();
    expect(handlerB).toBeDefined();
    expect(handlerA).not.toBe(handlerB);

    (routerA as unknown as { destroy: () => void }).destroy();

    // routerA's listener is gone, routerB's is untouched
    expect(
      removeDocumentSpy.mock.calls.some(
        ([type, handler]) => type === "scroll" && handler === handlerA,
      ),
    ).toBe(true);
    expect(
      removeDocumentSpy.mock.calls.some(
        ([type, handler]) => type === "scroll" && handler === handlerB,
      ),
    ).toBe(false);
    // a router is still active: native restoration stays manual
    expect(history.scrollRestoration).toBe("manual");

    // routerB still snapshots scroll positions
    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("pagehide"));

    const raw = sessionStorage.getItem(storageKey);
    expect(raw).toBeTruthy();
    const cache = JSON.parse(raw!) as Record<
      string,
      Record<string, { scrollX: number; scrollY: number }>
    >;
    const keys = Object.keys(cache);
    expect(keys.length).toBeGreaterThan(0);
    expect(cache[keys[0]!]!.window).toEqual({ scrollX: 0, scrollY: 0 });

    (routerB as unknown as { destroy: () => void }).destroy();
    expect(history.scrollRestoration).toBe("auto");
  });
});
