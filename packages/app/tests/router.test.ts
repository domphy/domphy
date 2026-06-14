// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createMemoryHistory,
  defineRoutes,
  type DomphyApp,
  navLink,
  notFound,
  type Route,
  type RouteContext,
  redirect,
  rewrite,
} from "../src/index";

const flush = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

let loaderCalls: string[] = [];

function buildRoutes(): Route[] {
  return defineRoutes([
    {
      path: "/",
      layout: (children) => ({
        div: [{ header: "Site Header" }, children],
      }),
      page: () => ({ h1: "Home" }),
      metadata: { title: { default: "Site", template: "%s | Site" } },
      notFound: () => ({ h1: "Custom 404" }),
      error: (error) => ({ h1: `Error: ${error.message}` }),
      children: [
        {
          path: "about",
          page: () => ({ h1: "About" }),
          metadata: { title: "About" },
        },
        {
          path: "blog/[slug]",
          loader: ({ params }) => {
            loaderCalls.push(String(params.slug));
            return { slug: params.slug };
          },
          loading: () => ({ p: "Loading post..." }),
          page: (context: RouteContext<{ slug: string }>) => ({
            h1: `Post ${context.data.slug}`,
          }),
        },
        {
          path: "slow",
          loader: () =>
            new Promise((resolve) => setTimeout(() => resolve("done"), 60)),
          loading: () => ({ p: "Loading slow..." }),
          page: (context) => ({ h1: `Slow ${context.data}` }),
        },
        {
          path: "cached",
          revalidate: 60,
          loader: () => {
            loaderCalls.push("cached");
            return "cached-data";
          },
          page: (context) => ({ h1: `Cached ${context.data}` }),
        },
        {
          path: "swr",
          revalidate: 0.01,
          loader: () => {
            loaderCalls.push("swr");
            const count = loaderCalls.filter((call) => call === "swr").length;
            return `v${count}`;
          },
          page: (context) => ({ h1: `SWR ${context.data}` }),
        },
        { path: "old", redirect: "/about" },
        {
          path: "private",
          loader: () => redirect("/about"),
          page: () => ({ h1: "Private" }),
        },
        {
          path: "ghost",
          loader: () => notFound(),
          page: () => ({ h1: "Ghost" }),
        },
        {
          path: "broken",
          loader: () => {
            throw new Error("boom");
          },
          page: () => ({ h1: "Broken" }),
        },
      ],
    },
  ]);
}

let app: DomphyApp;
let container: HTMLElement;

async function startApp(initial = "/"): Promise<void> {
  app = createApp(buildRoutes(), { history: createMemoryHistory(initial) });
  container = document.createElement("div");
  document.body.appendChild(container);
  await app.render(container);
  await flush();
}

beforeEach(() => {
  loaderCalls = [];
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  app?.destroy();
  container?.remove();
  vi.unstubAllGlobals();
});

describe("AppRouter", () => {
  it("renders the initial route inside its layout", async () => {
    await startApp();
    expect(container.textContent).toContain("Site Header");
    expect(container.textContent).toContain("Home");
    expect(document.title).toBe("Site");
  });

  it("navigates between routes and applies metadata", async () => {
    await startApp();
    await app.router.navigate("/about");
    await flush();
    expect(container.textContent).toContain("About");
    expect(container.textContent).not.toContain("Home");
    expect(document.title).toBe("About | Site");
    expect(app.router.state.get("pathname")).toBe("/about");
  });

  it("keeps the shared layout when navigating", async () => {
    await startApp();
    await app.router.navigate("/about");
    await flush();
    expect(container.textContent).toContain("Site Header");
  });

  it("passes loader data and params to pages", async () => {
    await startApp();
    await app.router.navigate("/blog/hello");
    await flush();
    expect(container.textContent).toContain("Post hello");
    expect(app.router.state.get("params")).toEqual({ slug: "hello" });
    expect(loaderCalls).toEqual(["hello"]);
  });

  it("shows the loading block while a loader is pending", async () => {
    await startApp();
    const navigation = app.router.navigate("/slow");
    await flush(30);
    expect(container.textContent).toContain("Loading slow...");
    await navigation;
    await flush();
    expect(container.textContent).toContain("Slow done");
  });

  it("caches loader results according to revalidate", async () => {
    await startApp();
    await app.router.navigate("/cached");
    await app.router.navigate("/about");
    await app.router.navigate("/cached");
    await flush();
    expect(container.textContent).toContain("Cached cached-data");
    expect(loaderCalls).toEqual(["cached"]);
  });

  it("serves stale data then revalidates in the background (SWR)", async () => {
    await startApp();
    await app.router.navigate("/swr");
    await flush();
    expect(container.textContent).toContain("SWR v1");
    expect(loaderCalls.filter((call) => call === "swr").length).toBe(1);

    await flush(20); // entry passes the 10ms revalidate window

    await app.router.navigate("/about");
    await app.router.navigate("/swr"); // serves stale v1, refetches in background
    await flush();
    await flush(20); // let the background revalidation re-render

    expect(loaderCalls.filter((call) => call === "swr").length).toBe(2);
    expect(container.textContent).toContain("SWR v2");
  });

  it("re-runs loaders on refresh()", async () => {
    await startApp();
    await app.router.navigate("/cached");
    await app.router.refresh();
    await flush();
    expect(loaderCalls).toEqual(["cached", "cached"]);
  });

  it("follows route-level redirects", async () => {
    await startApp();
    await app.router.navigate("/old");
    await flush();
    expect(container.textContent).toContain("About");
    expect(app.router.state.get("pathname")).toBe("/about");
  });

  it("follows redirect() thrown from loaders", async () => {
    await startApp();
    await app.router.navigate("/private");
    await flush();
    expect(container.textContent).toContain("About");
  });

  it("renders the nearest notFound block for notFound()", async () => {
    await startApp();
    await app.router.navigate("/ghost");
    await flush();
    expect(container.textContent).toContain("Custom 404");
    expect(app.router.state.get("status")).toBe("notfound");
  });

  it("renders the app notFound block for unknown URLs", async () => {
    app = createApp(buildRoutes(), {
      history: createMemoryHistory("/"),
      notFound: () => ({ h1: "App 404" }),
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await app.router.navigate("/totally/missing");
    await flush();
    expect(container.textContent).toContain("App 404");
  });

  it("renders the nearest error block when a loader throws", async () => {
    await startApp();
    await app.router.navigate("/broken");
    await flush();
    expect(container.textContent).toContain("Error: boom");
    expect(app.router.state.get("status")).toBe("error");
  });

  it("navigates back and forward through the history", async () => {
    await startApp();
    await app.router.navigate("/about");
    await flush();
    app.router.back();
    await flush();
    expect(container.textContent).toContain("Home");
    app.router.forward();
    await flush();
    expect(container.textContent).toContain("About");
  });

  it("uses prefetched data without re-running the loader", async () => {
    await startApp();
    await app.router.prefetch("/blog/prefetched");
    await app.router.navigate("/blog/prefetched");
    await flush();
    expect(container.textContent).toContain("Post prefetched");
    expect(loaderCalls).toEqual(["prefetched"]);
  });

  it("emits navigation events", async () => {
    await startApp();
    const events: string[] = [];
    app.router.addEventListener("routeChangeStart", (href) => {
      events.push(`start:${href}`);
    });
    app.router.addEventListener("routeChangeComplete", (href) => {
      events.push(`complete:${href}`);
    });
    await app.router.navigate("/about");
    await flush();
    expect(events).toContain("start:/about");
    expect(events).toContain("complete:/about");
  });

  it("applies global middleware rewrites", async () => {
    app = createApp(buildRoutes(), {
      history: createMemoryHistory("/"),
      middleware: [
        (context) => {
          if (context.pathname === "/alias") return rewrite("/about");
        },
      ],
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await app.router.navigate("/alias");
    await flush();
    expect(container.textContent).toContain("About");
    // The URL keeps the original pathname, like a Next.js rewrite.
    expect(app.router.state.get("pathname")).toBe("/alias");
  });

  it("applies middleware redirects", async () => {
    app = createApp(buildRoutes(), {
      history: createMemoryHistory("/"),
      middleware: [
        (context) => {
          if (context.pathname === "/go") redirect("/about");
        },
      ],
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    await app.render(container);
    await app.router.navigate("/go");
    await flush();
    expect(app.router.state.get("pathname")).toBe("/about");
  });
});

describe("navLink", () => {
  it("navigates on click and exposes active state", async () => {
    await startApp();
    const node = new ElementNode({
      div: [
        {
          a: "About",
          $: [navLink({ href: "/about", prefetch: false, router: app.router })],
        },
      ],
    });
    const linkContainer = document.createElement("div");
    document.body.appendChild(linkContainer);
    node.render(linkContainer);
    await flush();

    const anchor = linkContainer.querySelector("a") as HTMLAnchorElement;
    expect(anchor.getAttribute("href")).toBe("/about");
    expect(anchor.getAttribute("aria-current")).not.toBe("page");

    anchor.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    await flush(40);
    expect(container.textContent).toContain("About");
    expect(app.router.state.get("pathname")).toBe("/about");
    expect(anchor.getAttribute("aria-current")).toBe("page");

    node.remove();
    linkContainer.remove();
  });

  it("prefetches on hover", async () => {
    await startApp();
    const node = new ElementNode({
      div: [
        {
          a: "Post",
          $: [
            navLink({
              href: "/blog/hover",
              prefetch: "hover",
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

    const anchor = linkContainer.querySelector("a") as HTMLAnchorElement;
    anchor.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await flush(40);
    expect(loaderCalls).toEqual(["hover"]);

    node.remove();
    linkContainer.remove();
  });
});
