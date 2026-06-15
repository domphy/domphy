// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createMemoryHistory,
  type DomphyApp,
  defineRoutes,
  navLink,
  type Route,
  type RouteContext,
  type RouteModule,
} from "../src/index";
import { __resetLazyCache } from "../src/lazy";

const flush = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resolves after a delay, simulating the latency of a dynamic `import()`. */
function deferred<T>(value: T, delayMs = 30): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

let app: DomphyApp;
let container: HTMLElement;
let importCalls: string[] = [];

beforeEach(() => {
  importCalls = [];
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  app?.destroy();
  container?.remove();
  vi.unstubAllGlobals();
});

async function mount(routes: Route[], initial = "/"): Promise<void> {
  app = createApp(routes, { history: createMemoryHistory(initial) });
  container = document.createElement("div");
  document.body.appendChild(container);
  await app.render(container);
  await flush();
}

describe("lazy routes (client)", () => {
  it("renders a lazy page after the import resolves, showing loading first", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        children: [
          {
            path: "heavy",
            // Cheap config stays eager; the page is code-split.
            loading: () => ({ p: "Loading heavy..." }),
            lazy: () => {
              importCalls.push("heavy");
              return deferred<RouteModule>({
                page: () => ({ h1: "Heavy page" }),
              });
            },
          },
        ],
      },
    ]);
    await mount(routes);

    const navigation = app.router.navigate("/heavy");
    await flush(10);
    // The import is still in flight: the segment's loading UI shows.
    expect(container.textContent).toContain("Loading heavy...");
    expect(container.textContent).not.toContain("Heavy page");

    await navigation;
    await flush();
    expect(container.textContent).toContain("Heavy page");
    expect(importCalls).toEqual(["heavy"]);
  });

  it("resolves the lazy import only once and caches it across navigations", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        children: [
          {
            path: "lazy",
            lazy: () => {
              importCalls.push("lazy");
              return deferred<RouteModule>(
                { page: () => ({ h1: "Lazy page" }) },
                5,
              );
            },
          },
          { path: "other", page: () => ({ h1: "Other" }) },
        ],
      },
    ]);
    await mount(routes);

    await app.router.navigate("/lazy");
    await flush();
    expect(container.textContent).toContain("Lazy page");

    await app.router.navigate("/other");
    await flush();
    await app.router.navigate("/lazy");
    await flush();
    expect(container.textContent).toContain("Lazy page");

    // Two visits, but the dynamic import ran exactly once.
    expect(importCalls).toEqual(["lazy"]);
  });

  it("routes a rejected import to the nearest error boundary", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        error: (error) => ({ h1: `Boundary: ${error.message}` }),
        children: [
          {
            path: "broken",
            lazy: () => {
              importCalls.push("broken");
              return Promise.reject(new Error("chunk load failed"));
            },
          },
        ],
      },
    ]);
    await mount(routes);

    await app.router.navigate("/broken");
    await flush();
    expect(container.textContent).toContain("Boundary: chunk load failed");
    expect(app.router.state.get("status")).toBe("error");
    // The app did not crash; the shared layout/home is replaced by the boundary.
    expect(importCalls).toEqual(["broken"]);
  });

  it("renders an eager child under a lazy layout", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        // The shell layout is code-split; the child page stays eager.
        lazy: () =>
          deferred<RouteModule>({
            layout: (children) => ({
              div: [{ header: "Lazy Shell" }, children],
            }),
          }),
        children: [
          { path: "", page: () => ({ h1: "Eager Home" }) },
          { path: "about", page: () => ({ h1: "Eager About" }) },
        ],
      },
    ]);
    await mount(routes);
    expect(container.textContent).toContain("Lazy Shell");
    expect(container.textContent).toContain("Eager Home");

    await app.router.navigate("/about");
    await flush();
    expect(container.textContent).toContain("Lazy Shell");
    expect(container.textContent).toContain("Eager About");
  });

  it("loads a loader supplied by the lazy module", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        children: [
          {
            path: "data",
            lazy: () =>
              deferred<RouteModule>(
                {
                  loader: () => ({ value: 42 }),
                  page: (context: RouteContext<{ value: number }>) => ({
                    h1: `Value ${context.data.value}`,
                  }),
                },
                5,
              ),
          },
        ],
      },
    ]);
    await mount(routes);

    await app.router.navigate("/data");
    await flush();
    expect(container.textContent).toContain("Value 42");
  });
});

describe("lazy routes (prefetch)", () => {
  it("router.prefetch triggers the dynamic import ahead of navigation", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        children: [
          {
            path: "heavy",
            lazy: () => {
              importCalls.push("heavy");
              return deferred<RouteModule>({
                page: () => ({ h1: "Heavy" }),
              });
            },
          },
        ],
      },
    ]);
    await mount(routes);

    await app.router.prefetch("/heavy");
    expect(importCalls).toEqual(["heavy"]);

    // The later navigation reuses the already-imported module (still one call).
    await app.router.navigate("/heavy");
    await flush();
    expect(container.textContent).toContain("Heavy");
    expect(importCalls).toEqual(["heavy"]);
  });

  it("navLink hover prefetch triggers the dynamic import", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        children: [
          {
            path: "heavy",
            lazy: () => {
              importCalls.push("heavy");
              return deferred<RouteModule>({
                page: () => ({ h1: "Heavy" }),
              });
            },
          },
        ],
      },
    ]);
    await mount(routes);

    const node = new ElementNode({
      a: "Heavy",
      $: [navLink({ href: "/heavy", prefetch: "hover", router: app.router })],
    });
    const linkContainer = document.createElement("div");
    document.body.appendChild(linkContainer);
    node.render(linkContainer);
    await flush();

    const anchor = linkContainer.querySelector("a") as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await flush(40);
    expect(importCalls).toEqual(["heavy"]);

    node.remove();
    linkContainer.remove();
  });
});

describe("lazy routes (SSR + streaming)", () => {
  function ssrRoutes(): Route[] {
    return defineRoutes([
      {
        path: "/",
        layout: (children) => ({ div: [{ header: "SSR Shell" }, children] }),
        children: [
          {
            path: "heavy",
            metadata: { title: "Heavy" },
            lazy: () => {
              importCalls.push("heavy");
              return deferred<RouteModule>(
                { page: () => ({ h1: "SSR Heavy page" }) },
                5,
              );
            },
          },
        ],
      },
    ]);
  }

  it("renderToString awaits the lazy module before rendering", async () => {
    const routes = ssrRoutes();
    __resetLazyCache(routes);
    const ssrApp = createApp(routes, { history: null });
    const result = await ssrApp.renderToString("/heavy");

    expect(result.status).toBe(200);
    expect(result.html).toContain("SSR Shell");
    expect(result.html).toContain("SSR Heavy page");
    expect(result.head).toContain("<title>Heavy</title>");
    expect(importCalls).toContain("heavy");
  });

  it("renderToStream flushes a loading shell then the lazy content", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        layout: (children) => ({ div: [{ header: "Stream Shell" }, children] }),
        children: [
          {
            path: "heavy",
            loading: () => ({ p: "Loading lazy stream..." }),
            lazy: () =>
              deferred<RouteModule>(
                { page: () => ({ h1: "Streamed Heavy" }) },
                30,
              ),
          },
        ],
      },
    ]);
    __resetLazyCache(routes);
    const streamApp = createApp(routes, { history: null });
    const { stream, status } = await streamApp.renderToStream("/heavy");
    expect(status).toBe(200);

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const first = decoder.decode((await reader.read()).value);

    // Shell flushes first with the loading fallback, no lazy content yet.
    expect(first).toContain("Stream Shell");
    expect(first).toContain("Loading lazy stream...");
    expect(first).not.toContain("Streamed Heavy");

    let rest = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      rest += decoder.decode(value);
    }
    expect(rest).toContain("Streamed Heavy");
    expect(rest).toContain('id="domphy-content"');
  });
});
