/**
 * SSR surface smoke — createRequestHandler + handler callback path.
 * Router previously shipped ./ssr/server with zero package tests; this covers
 * the minimal production entry so regressions fail the suite.
 *
 * Every router here is built with `isServer: true`. createRequestHandler
 * swaps in a server history, and a server history ignores `push()` (its
 * location is fixed to the request href). A router left in client mode runs
 * the client load pipeline, whose `followRedirect` -> `commitLocation` ->
 * `load` cycle then never advances past the redirecting route and spins
 * forever, because upstream's 20-redirect cap is keyed on the pending
 * location href that the ignored push never produced. `isServer: true`
 * routes loads to `loadServerRoute`, which reports the redirect through
 * `router._serverResult` instead of committing it.
 */
import { describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
  redirect,
} from "../src/index";
import { createRequestHandler } from "../src/ssr/server";

describe("ssr/server createRequestHandler", () => {
  it("exports a request handler that loads the matched route and returns a Response", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const aboutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "about",
    });

    const createAppRouter = () =>
      createRouter({
        routeTree: rootRoute.addChildren([indexRoute, aboutRoute]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
        isServer: true,
      });

    const handle = createRequestHandler({
      createRouter: createAppRouter,
      request: new Request("http://localhost/about"),
    });

    const response = await handle(async ({ request, router }) => {
      expect(request.url).toContain("/about");
      await router.load();
      const matched = router.state.matches.map((m) => m.routeId);
      expect(matched).toContain(aboutRoute.id);
      return new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("rejects when the handler callback throws", async () => {
    const rootRoute = createRootRoute();
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });
    const handle = createRequestHandler({
      createRouter: () =>
        createRouter({
          routeTree: rootRoute.addChildren([indexRoute]),
          history: createMemoryHistory({ initialEntries: ["/"] }),
          isServer: true,
        }),
      request: new Request("http://localhost/"),
    });

    await expect(
      handle(async () => {
        throw new Error("handler boom");
      }),
    ).rejects.toThrow("handler boom");
  });

  it("does not emit Location: //host from a protocol-relative redirect href", async () => {
    const response = await handleRedirectingRequest(() => {
      throw redirect({ href: "//evil.com" });
    });
    const location = response.headers.get("Location");
    expect(location).not.toBe("//evil.com");
    expect(location?.startsWith("//")).toBeFalsy();
  });

  it("does not emit a pre-set Location: //host when merging redirect headers", async () => {
    const response = await handleRedirectingRequest(() => {
      throw redirect({
        href: "/safe",
        headers: { Location: "//evil.com" },
      });
    });
    const location = response.headers.get("Location");
    expect(location).not.toBe("//evil.com");
    expect(location?.startsWith("//")).toBeFalsy();
  });

  it("does not emit Location: javascript: from a redirect", async () => {
    const response = await handleRedirectingRequest(() => {
      throw redirect({ href: "javascript:alert(1)" });
    });
    const location = response.headers.get("Location");
    expect(location?.toLowerCase().startsWith("javascript:")).toBeFalsy();
  });

  it("still emits Location for a same-origin path redirect", async () => {
    const response = await handleRedirectingRequest(() => {
      throw redirect({ href: "/login" });
    });
    expect(response.headers.get("Location")).toBe("/login");
  });

  // Truth source: termination. A request handler must answer a request in
  // bounded time. `createRequestHandler` installs a `createServerHistory`,
  // whose `push()` is a no-op, so a router left in client mode runs
  // `followRedirect` -> `commitLocation` -> `load` forever on a redirecting
  // route (the 20-redirect cap is keyed on a pending location the ignored
  // push never produces) and the process grows until it OOMs. The handler
  // owns the server history, so it owns server mode too.
  it(
    "terminates on a redirecting route when the router was not created with isServer",
    { timeout: 5000 },
    async () => {
      const rootRoute = createRootRoute();
      const indexRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "/",
      });
      const loginRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "login",
      });
      const trapRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: "trap",
        loader: () => {
          throw redirect({ to: "/login" });
        },
      });
      const handle = createRequestHandler({
        createRouter: () =>
          createRouter({
            routeTree: rootRoute.addChildren([
              indexRoute,
              loginRoute,
              trapRoute,
            ]),
            history: createMemoryHistory({ initialEntries: ["/"] }),
            // deliberately NOT isServer: true
          }),
        request: new Request("http://localhost/trap"),
      });

      const response = await handle(
        async () => new Response("ok", { status: 200 }),
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("/login");
    },
  );
});

async function handleRedirectingRequest(loader: () => never) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
  });
  const trapRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "trap",
    loader,
  });
  const handle = createRequestHandler({
    createRouter: () =>
      createRouter({
        routeTree: rootRoute.addChildren([indexRoute, trapRoute]),
        history: createMemoryHistory({ initialEntries: ["/"] }),
        isServer: true,
      }),
    request: new Request("http://localhost/trap"),
  });
  return handle(async ({ responseHeaders }) => {
    // Only reached when the load produced no redirect.
    return new Response("ok", { status: 200, headers: responseHeaders });
  });
}

function makeServerRouter(url: string) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "login",
  });
  const trapRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "trap",
    loader: () => {
      throw redirect({ to: "/login" });
    },
  });
  const goneRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "gone",
    loader: () => {
      throw notFound();
    },
  });
  return createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      loginRoute,
      trapRoute,
      goneRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [url] }),
    isServer: true,
  });
}

// Truth source: upstream's ServerLoadResult contract plus HTTP semantics
// (307 for a router redirect, 404 for a notFound match). This is also the
// exact pattern apps/web/docs/router/ssr.md tells users to write.
describe("server load result (the documented manual SSR pattern)", () => {
  it("reports a redirect via _serverResult", { timeout: 5000 }, async () => {
    const router = makeServerRouter("/trap");
    await router.load();
    const result = router._serverResult;
    expect(result?.type).toBe("redirect");
    if (result?.type === "redirect") {
      expect(result.redirect.headers.get("Location")).toBe("/login");
      expect(result.redirect.status).toBe(307);
    }
  });

  it("reports render + 200 for a normal route", { timeout: 5000 }, async () => {
    const router = makeServerRouter("/login");
    await router.load();
    const result = router._serverResult;
    expect(result?.type).toBe("render");
    if (result?.type === "render") expect(result.status).toBe(200);
  });

  it("reports render + 404 for a notFound route", { timeout: 5000 }, async () => {
    const router = makeServerRouter("/gone");
    await router.load();
    const result = router._serverResult;
    expect(result?.type).toBe("render");
    if (result?.type === "render") expect(result.status).toBe(404);
  });
});
