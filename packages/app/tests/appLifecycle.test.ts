// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppRouter,
  createApp,
  createMemoryHistory,
  defineRoutes,
  getRouter,
  navLink,
  type Route,
} from "../src/index";

const flush = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getRouter", () => {
  it("throws when no router has been created", () => {
    // Tear down any router left registered as the default singleton, so the
    // throw-when-no-router path is reachable.
    let guard = 0;
    while (guard++ < 50) {
      try {
        getRouter().destroy();
      } catch {
        break;
      }
    }
    expect(() => getRouter()).toThrow(/No router created yet/);
  });

  it("navLink without an explicit router throws when no router exists", async () => {
    // Ensure no default router is registered.
    let guard = 0;
    while (guard++ < 50) {
      try {
        getRouter().destroy();
      } catch {
        break;
      }
    }

    const part = navLink({ href: "/about", prefetch: false });
    // The active-state listeners call getRouter() lazily; with no router they throw.
    expect(() =>
      (part.ariaCurrent as (listener?: unknown) => unknown)(undefined),
    ).toThrow(/No router created yet/);
  });
});

describe("DomphyApp.destroy", () => {
  it("releases history and the default-router singleton", async () => {
    const history = createMemoryHistory("/");
    const release = vi.fn();
    const realListen = history.listen.bind(history);
    history.listen = (callback) => {
      const off = realListen(callback);
      return () => {
        release();
        off();
      };
    };

    const app = createApp(
      defineRoutes([{ path: "/", page: () => ({ h1: "Home" }) }]),
      { history },
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await flush();

    // The default-router singleton points at this app's router while alive.
    expect(getRouter()).toBe(app.router);

    app.destroy();

    // History listener was released ...
    expect(release).toHaveBeenCalledTimes(1);
    // ... and the default-router singleton was cleared.
    expect(() => getRouter()).toThrow(/No router created yet/);

    container.remove();
  });
});

describe("redirect-loop guard", () => {
  it("renders the loop-detection error after too many redirects", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        error: (error) => ({ h1: `Boom: ${error.message}` }),
        children: [
          { path: "ping", redirect: "/pong" },
          { path: "pong", redirect: "/ping" },
        ],
      },
    ]);
    const app = createApp(routes, { history: createMemoryHistory("/") });
    const container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await flush();

    await app.router.navigate("/ping");
    await flush(60);

    expect(app.router.state.get("status")).toBe("error");
    const error = app.router.state.get("error") as Error;
    expect(error.message).toMatch(/Redirect loop detected/);
    expect(container.textContent).toContain("Redirect loop detected");

    app.destroy();
    container.remove();
  });
});

describe("renderToStream redirect", () => {
  it("returns an empty shell and the redirect target for a route-level redirect", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          { path: "old", redirect: "/new" },
          { path: "new", page: () => ({ h1: "Destination Page" }) },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    const { stream, status, redirect } = await app.renderToStream("/old");

    // The redirect is reported through the status + redirect fields.
    expect(status).toBe(307);
    expect(redirect).toBe("/new");

    // The streamed body is just an empty shell: it never renders the target
    // page's content (the caller is expected to issue the redirect response).
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let body = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      body += decoder.decode(value);
    }
    expect(body).toContain("domphy-app");
    expect(body).not.toContain("Destination Page");
  });

  it("uses a 308 status for a permanent route-level redirect", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [{ path: "gone", redirect: "/here", permanent: true }],
      },
    ]);
    const app = createApp(routes, { history: null });
    const { status, redirect } = await app.renderToStream("/gone");
    expect(status).toBe(308);
    expect(redirect).toBe("/here");
  });
});

describe("navLink visible prefetch observer", () => {
  it("disconnects the IntersectionObserver on unmount", async () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    class FakeObserver {
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = () => [];
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);

    const app = createApp(
      defineRoutes([{ path: "/", page: () => ({ h1: "Home" }) }]),
      { history: createMemoryHistory("/") },
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await flush();

    const node = new ElementNode({
      div: [
        {
          a: "About",
          $: [
            navLink({
              href: "/about",
              prefetch: "visible",
              router: app.router,
            }),
          ],
        },
      ],
    });
    const linkContainer = document.createElement("div");
    document.body.appendChild(linkContainer);
    node.render(linkContainer);
    await flush();

    // The observer began observing on mount.
    expect(observe).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();

    // Unmount the link; _onRemove must disconnect the observer.
    node.remove();
    expect(disconnect).toHaveBeenCalledTimes(1);

    linkContainer.remove();
    app.destroy();
    container.remove();
  });
});

// Reference the AppRouter export so unused-import lint does not flag it; also a
// light sanity check that a freshly constructed router registers as default.
describe("AppRouter singleton", () => {
  it("registers itself as the default router on construction", () => {
    const router = new AppRouter([{ path: "/" } as Route], { history: null });
    expect(getRouter()).toBe(router);
    router.destroy();
    expect(() => getRouter()).toThrow();
  });
});
