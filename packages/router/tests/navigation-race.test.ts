// Regression coverage for the navigation-race class fixed in @domphy/app
// (superseded navigation applying state before a final staleness check).
// RouterCore keys every match write by match id and deletes superseded
// pending matches in setPending(), so a stale navigation's late loader
// resolution must be dead-on-arrival: no stale loaderData, no match
// resurrection, no premature commit of the newer navigation.
import { describe, expect, it, vi } from "vitest";
import {
  MatchSupersededError,
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

  it("a superseded navigation's late completion does not clobber the redirect store", async () => {
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
    const redirectAfterRedirect = router.state.redirect;
    expect(redirectAfterRedirect).toBeDefined();

    // A's stale loader resolves now. Its dead load must not touch the
    // redirect store that the newer navigation set.
    aLoader.resolve({ page: "A-stale" });
    await navA;
    await sleep(20);

    expect(router.state.location.pathname).toBe("/c");
    expect(router.state.redirect).toBe(redirectAfterRedirect);
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

describe("MatchSupersededError sentinel (explicit stale-load abort)", () => {
  it("a match store disappearing mid-load aborts with MatchSupersededError, not an implicit TypeError", async () => {
    const { router, aRoute, aLoader } = createRaceSetup();
    await router.load();

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    // preloadRoute logs non-notFound load errors instead of throwing, which
    // makes the abort error observable.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      // Start the preload: every getMatch call up to the loader's first await
      // runs synchronously inside this call and still sees the match store.
      const preloadPromise = router.preloadRoute({ to: "/a" });
      const aMatch = router.stores.cachedMatches
        .get()
        .find((match) => match.routeId === aRoute.id);
      expect(aMatch).toBeDefined();

      // Now simulate the store disappearing under the in-flight load — what
      // a newer navigation's setPending() does to a superseded load.
      const originalGetMatch = router.getMatch;
      (router as any).getMatch = (matchId: string) => {
        if (matchId === aMatch!.id) return undefined;
        return originalGetMatch(matchId);
      };
      try {
        aLoader.resolve({ page: "A" });
        // Preload errors are swallowed (return undefined) after being logged.
        expect(await preloadPromise).toBeUndefined();
        await sleep(20);
      } finally {
        (router as any).getMatch = originalGetMatch;
      }

      const logged = errorSpy.mock.calls.map((call) => call[0]);
      expect(
        logged.some((err) => err instanceof MatchSupersededError),
      ).toBe(true);
      // No implicit TypeError control flow and no unhandled rejection.
      expect(logged.every((err) => !(err instanceof TypeError))).toBe(true);
      expect(unhandled).toEqual([]);
    } finally {
      errorSpy.mockRestore();
      process.removeListener("unhandledRejection", onUnhandled);
    }
  });

  it("a superseded load hits the sentinel abort path: no premature commit, no unhandled rejection", async () => {
    const { router, rootRoute, bRoute, aLoader, bLoader } = createRaceSetup();
    await router.load();

    // Record every getMatch call that comes back empty — that is the exact
    // condition the MatchSupersededError guard converts into an abort.
    const originalGetMatch = router.getMatch;
    let sawMissingMatch = false;
    (router as any).getMatch = (matchId: string) => {
      const match = originalGetMatch(matchId);
      if (!match) sawMissingMatch = true;
      return match;
    };

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const navA = router.navigate({ to: "/a" });
      await sleep(10);

      // B supersedes A but stays pending on its own loader.
      const navB = router.navigate({ to: "/b" });
      await sleep(10);

      // A's stale loader resolves while B is still in flight. Its load must
      // abort via the sentinel path...
      aLoader.resolve({ page: "A-stale" });
      await sleep(20);
      expect(sawMissingMatch).toBe(true);

      // ...without committing B's still-pending matches early.
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
      expect(unhandled).toEqual([]);
    } finally {
      (router as any).getMatch = originalGetMatch;
      process.removeListener("unhandledRejection", onUnhandled);
    }
  });
});
