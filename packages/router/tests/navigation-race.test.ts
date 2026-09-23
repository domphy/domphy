// Regression coverage for the navigation-race class: a superseded navigation
// applying state after a newer one committed. Upstream 1.171.32 owns this
// through per-load transactions (`router._tx`) plus an AbortController the
// superseding load aborts, and gates every redirect-follow and store write on
// `router._tx === tx`. These tests assert the observable contract only — a
// stale navigation's late loader resolution is dead-on-arrival: no stale
// loaderData, no location move, no premature commit of the newer navigation.
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "../src/index";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createRaceSetup() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const aLoader = deferred<{ page: string }>();
  const bLoader = deferred<{ page: string }>();
  const aRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/a",
    loader: () => aLoader.promise,
  });
  const bRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/b",
    loader: () => bLoader.promise,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, aRoute, bRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return { router, rootRoute, aRoute, bRoute, aLoader, bLoader };
}

describe("navigation races (superseded navigation)", () => {
  it("a superseded slow navigation never clobbers the newer committed navigation", async () => {
    const { router, rootRoute, aRoute, bRoute, aLoader, bLoader } =
      createRaceSetup();
    await router.load();

    // Navigation A starts and suspends on its (never-yet-resolved) loader.
    const navA = router.navigate({ to: "/a" });
    await sleep(10);
    expect(router.state.isLoading).toBe(true);

    // Navigation B supersedes A and completes fully.
    const navB = router.navigate({ to: "/b" });
    bLoader.resolve({ page: "B" });
    await navB;

    expect(router.state.location.pathname).toBe("/b");
    expect(
      router.state.matches.find((match) => match.routeId === bRoute.id)
        ?.loaderData,
    ).toEqual({ page: "B" });

    // A's stale loader resolves only now — after B committed.
    aLoader.resolve({ page: "A-stale" });
    await navA;
    await sleep(20);

    // Final state must still be exactly B: no /a resurrection, no stale data,
    // no stuck loading flags.
    expect(router.state.location.pathname).toBe("/b");
    expect(router.state.matches.map((match) => match.routeId)).toEqual([
      rootRoute.id,
      bRoute.id,
    ]);
    expect(
      router.state.matches.find((match) => match.routeId === bRoute.id)
        ?.loaderData,
    ).toEqual({ page: "B" });
    expect(
      router.state.matches.some((match) => match.routeId === aRoute.id),
    ).toBe(false);
    expect(router.state.isLoading).toBe(false);
    expect(router.state.status).toBe("idle");
  });

  it("a superseded slow navigation resolving mid-flight of the newer one does not commit early", async () => {
    const { router, rootRoute, bRoute, aLoader, bLoader } = createRaceSetup();
    await router.load();

    const navA = router.navigate({ to: "/a" });
    await sleep(10);

    // B starts but stays pending on its own loader.
    const navB = router.navigate({ to: "/b" });
    await sleep(10);

    // A's stale loader resolves while B is still in flight.
    aLoader.resolve({ page: "A-stale" });
    await sleep(20);

    // B's matches must NOT be committed early with pending status: the only
    // committed matches so far are from the initial "/" load.
    expect(router.state.location.pathname).toBe("/b");
    expect(
      router.state.matches.some((match) => match.routeId === bRoute.id),
    ).toBe(false);

    bLoader.resolve({ page: "B" });
    await navB;
    await navA;
    await sleep(20);

    expect(router.state.matches.map((match) => match.routeId)).toEqual([
      rootRoute.id,
      bRoute.id,
    ]);
    expect(
      router.state.matches.find((match) => match.routeId === bRoute.id)
        ?.loaderData,
    ).toEqual({ page: "B" });
  });

  it("a superseded navigation's late redirect does not hijack the committed location", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const aLoader = deferred<{ page: string }>();
    const aRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/a",
      loader: () => aLoader.promise,
    });
    const bRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/b",
      loader: () => ({ page: "B" }),
    });
    const targetRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/a-target",
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        aRoute,
        bRoute,
        targetRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();

    const navA = router.navigate({ to: "/a" });
    await sleep(10);
    await router.navigate({ to: "/b" });

    // A's loader comes back long after it was superseded, throwing a
    // redirect. Following it would yank the user away from /b.
    aLoader.reject(redirect({ to: "/a-target" }));
    await navA;
    await sleep(20);

    expect(router.state.location.pathname).toBe("/b");
    expect(router.state.matches.map((match) => match.routeId)).toEqual([
      rootRoute.id,
      bRoute.id,
    ]);
  });

  it("a stale loader resolving after a redirect committed does not move the location", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const aLoader = deferred<{ page: string }>();
    const aRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/a",
      loader: () => aLoader.promise,
    });
    const bRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/b",
      loader: () => {
        throw redirect({ to: "/c" });
      },
    });
    const cRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/c",
      loader: () => ({ page: "C" }),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, aRoute, bRoute, cRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();

    const navA = router.navigate({ to: "/a" });
    await sleep(10);

    // B supersedes A and immediately redirects to /c.
    await router.navigate({ to: "/b" });
    await sleep(20);
    expect(router.state.location.pathname).toBe("/c");

    // A's stale loader resolves now. Its dead load must not move the
    // location the newer navigation redirected to.
    aLoader.resolve({ page: "A-stale" });
    await navA;
    await sleep(20);

    expect(router.state.location.pathname).toBe("/c");
  });

  it("param-change navigation to the same route resolves to the newest params", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const loaders = new Map<string, ReturnType<typeof deferred<{ id: string }>>>();
    const postRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/posts/$postId",
      loader: ({ params }) => {
        const entry = deferred<{ id: string }>();
        loaders.set(params.postId, entry);
        return entry.promise;
      },
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await router.load();

    const nav1 = router.navigate({
      to: "/posts/$postId",
      params: { postId: "1" },
    });
    await sleep(10);
    const nav2 = router.navigate({
      to: "/posts/$postId",
      params: { postId: "2" },
    });
    await sleep(10);

    // Resolve the OLD navigation's loader after the new one started.
    loaders.get("1")!.resolve({ id: "1" });
    await sleep(20);
    loaders.get("2")!.resolve({ id: "2" });
    await nav2;
    await nav1;
    await sleep(20);

    const postMatch = router.state.matches.find(
      (match) => match.routeId === postRoute.id,
    );
    expect(router.state.location.pathname).toBe("/posts/2");
    expect(postMatch?.params).toEqual({ postId: "2" });
    expect(postMatch?.loaderData).toEqual({ id: "2" });
  });
});

describe("SWR background redirect", () => {
  function createSwrRedirectSetup() {
    let loadCount = 0;
    const background = deferred<never>();
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const pageRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/page",
      loader: () => {
        loadCount += 1;
        if (loadCount === 1) return { page: "ok" };
        return background.promise;
      },
    });
    const otherRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/other",
      loader: () => ({ page: "other" }),
    });
    const hijackRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/hijack",
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        pageRoute,
        otherRoute,
        hijackRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    return { router, background, pageRoute };
  }

  it("does not follow a SWR background redirect after the location is superseded", async () => {
    const { router, background } = createSwrRedirectSetup();
    await router.load();
    await router.navigate({ to: "/page" });
    expect(router.state.location.pathname).toBe("/page");

    // invalidate() reloads the successful match in the background IIFE
    // (status === 'success' && invalid && staleReloadMode !== 'blocking').
    const invalidatePromise = router.invalidate();
    await invalidatePromise;
    await router.navigate({ to: "/other" });
    expect(router.state.location.pathname).toBe("/other");

    background.reject(redirect({ to: "/hijack" }));
    await sleep(30);

    expect(router.state.location.pathname).toBe("/other");
    expect(
      router.state.matches.some((match) => match.fullPath === "/hijack"),
    ).toBe(false);
  });

  it("follows a SWR background redirect while the location is still current", async () => {
    const { router, background } = createSwrRedirectSetup();
    await router.load();
    await router.navigate({ to: "/page" });

    await router.invalidate();
    background.reject(redirect({ to: "/hijack" }));
    await sleep(30);

    expect(router.state.location.pathname).toBe("/hijack");
  });
});
