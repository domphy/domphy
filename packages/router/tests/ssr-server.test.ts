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
      }),
    request: new Request("http://localhost/trap"),
  });
  return handle(async ({ responseHeaders }) => {
    return new Response("ok", { status: 200, headers: responseHeaders });
  });
}
