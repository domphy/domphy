import { describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "../src/index";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

describe("transitioner (client event lifecycle)", () => {
  it("emits onLoad, onBeforeRouteMount and onResolved after navigation", async () => {
    const { router } = createTestSetup();
    await router.load();

    const events: Array<string> = [];
    for (const type of [
      "onLoad",
      "onBeforeRouteMount",
      "onResolved",
    ] as const) {
      router.subscribe(type, () => events.push(type));
    }

    await router.navigate({ to: "/posts/$postId", params: { postId: "1" } });
    await sleep(20);

    expect(events).toContain("onLoad");
    expect(events).toContain("onBeforeRouteMount");
    expect(events).toContain("onResolved");
  });

  it("emits onRendered after onResolved", async () => {
    const { router } = createTestSetup();
    await router.load();

    const events: Array<string> = [];
    router.subscribe("onResolved", () => events.push("onResolved"));
    router.subscribe("onRendered", () => events.push("onRendered"));

    await router.navigate({ to: "/posts/$postId", params: { postId: "2" } });
    await sleep(50);

    expect(events.indexOf("onResolved")).toBeGreaterThanOrEqual(0);
    expect(events.indexOf("onRendered")).toBeGreaterThan(
      events.indexOf("onResolved"),
    );
  });

  it("reloads matches when history changes behind the router", async () => {
    const { router, postRoute } = createTestSetup();
    await router.load();

    router.history.push("/posts/7");
    await sleep(20);

    const match = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === postRoute.id,
    );
    expect(match).toBeDefined();
    expect(match?.loaderData).toEqual({ title: "Post 7" });
  });

  it("settles status back to idle and updates resolvedLocation", async () => {
    const { router } = createTestSetup();
    await router.load();

    await router.navigate({ to: "/posts/$postId", params: { postId: "3" } });
    await sleep(20);

    expect(router.state.status).toBe("idle");
    expect(router.state.resolvedLocation?.pathname).toBe("/posts/3");
  });

  it("does not emit onRendered after the router is destroyed", async () => {
    const { router } = createTestSetup();
    await router.load();
    // Let the initial load's onRendered macrotasks fire before subscribing.
    await sleep(20);

    const events: Array<string> = [];
    router.subscribe("onRendered", () => events.push("onRendered"));
    // Destroy on the macrotask queued right before the transitioner's
    // onRendered timer (scheduled just after onResolved is emitted).
    router.subscribe("onResolved", () => {
      setTimeout(
        () => (router as unknown as { destroy: () => void }).destroy(),
        0,
      );
    });

    await router.navigate({ to: "/posts/$postId", params: { postId: "4" } });
    await sleep(20);

    expect(events).toEqual([]);
  });
});
