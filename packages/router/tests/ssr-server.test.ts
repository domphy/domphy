/**
 * SSR surface smoke — createRequestHandler + handler callback path.
 * Router previously shipped ./ssr/server with zero package tests; this covers
 * the minimal production entry so regressions fail the suite.
 */
import { describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
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
        }),
      request: new Request("http://localhost/"),
    });

    await expect(
      handle(async () => {
        throw new Error("handler boom");
      }),
    ).rejects.toThrow("handler boom");
  });
});
