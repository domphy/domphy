// @vitest-environment jsdom

import { configure } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  defineRoutes,
  navLink,
  type Route,
  type RouteContext,
  rewrite,
} from "../src/index";

let loaderRuns = 0;

function buildRoutes(): Route[] {
  return defineRoutes([
    {
      path: "/",
      layout: (children) => ({ div: [{ header: "Header" }, children] }),
      page: () => ({ h1: "Home" }),
      metadata: { title: { default: "Site", template: "%s | Site" } },
      children: [
        {
          path: "blog/[slug]",
          metadata: (context) => ({ title: `Post ${context.params.slug}` }),
          loader: ({ params }) => {
            loaderRuns++;
            return { slug: params.slug, body: `Body of ${params.slug}` };
          },
          page: (context: RouteContext<{ slug: string; body: string }>) => ({
            article: [
              { h1: `Post ${context.data.slug}` },
              { p: context.data.body },
            ],
          }),
        },
        { path: "old", redirect: "/blog/new", permanent: true },
      ],
    },
  ]);
}

afterEach(() => {
  loaderRuns = 0;
  configure({ cspNonce: undefined });
  delete (globalThis as Record<string, unknown>).__DOMPHY_APP_DATA__;
  document.head.innerHTML = "";
});

describe("renderToString", () => {
  it("renders markup, css and head for a route", async () => {
    const app = createApp(buildRoutes(), { history: null });
    const result = await app.renderToString("/blog/hello");

    expect(result.status).toBe(200);
    expect(result.html).toContain("Post hello");
    expect(result.html).toContain("Body of hello");
    expect(result.html).toContain("Header");
    expect(result.head).toContain("<title>Post hello | Site</title>");
    expect(typeof result.css).toBe("string");
    expect(Object.values(result.data)).toContainEqual({
      slug: "hello",
      body: "Body of hello",
    });
    expect(result.bootstrapScript).toContain("__DOMPHY_APP_DATA__");
  });

  it("returns 404 for unknown URLs", async () => {
    const app = createApp(buildRoutes(), { history: null });
    const result = await app.renderToString("/missing");
    expect(result.status).toBe(404);
    expect(result.html).toContain("404");
  });

  it("reports redirects with a permanent-aware status", async () => {
    const app = createApp(buildRoutes(), { history: null });
    const result = await app.renderToString("/old");
    expect(result.status).toBe(308);
    expect(result.redirect).toBe("/blog/new");
  });

  it("returns 500 when a loader throws during server rendering", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
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
    const app = createApp(routes, { history: null });
    const result = await app.renderToString("/broken");
    expect(result.status).toBe(500);
    expect(result.html).toContain("boom");
  });

  it("escapes U+2028/U+2029 in the bootstrap payload", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        loader: () => ({ text: "a\u2028b\u2029c" }),
        page: () => ({ h1: "X" }),
      },
    ]);
    const app = createApp(routes, { history: null });
    const result = await app.renderToString("/");
    expect(result.bootstrapScript).not.toContain("\u2028");
    expect(result.bootstrapScript).not.toContain("\u2029");
    expect(result.bootstrapScript).toContain("\\u2028");
    expect(result.bootstrapScript).toContain("\\u2029");
  });

  it("escapes script-closing tags in the bootstrap payload", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        loader: () => ({ html: "</script><script>alert(1)</script>" }),
        page: () => ({ h1: "X" }),
      },
    ]);
    const app = createApp(routes, { history: null });
    const result = await app.renderToString("/");
    expect(result.bootstrapScript).not.toContain("</script><script>alert(1)");
  });
});

describe("CSP nonce", () => {
  it("stamps the configured nonce on the renderToString bootstrap script", async () => {
    configure({ cspNonce: "test-nonce-123" });
    const app = createApp(buildRoutes(), { history: null });
    const result = await app.renderToString("/blog/hello");
    expect(result.bootstrapScript).toContain('<script nonce="test-nonce-123">');
  });

  it("omits the nonce attribute when no nonce is configured", async () => {
    const app = createApp(buildRoutes(), { history: null });
    const result = await app.renderToString("/blog/hello");
    expect(result.bootstrapScript).toContain("<script>");
    expect(result.bootstrapScript).not.toContain("nonce");
  });

  it("stamps the nonce on every inline style/script in the streamed output", async () => {
    configure({ cspNonce: "stream-nonce" });
    const routes = defineRoutes([
      {
        path: "/",
        loader: () => Promise.resolve("data"),
        page: () => ({ h1: "Streamed" }),
      },
    ]);
    const app = createApp(routes, { history: null });
    const { stream } = await app.renderToStream("/");

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let output = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    expect(output).toContain('<style id="domphy-style" nonce="stream-nonce">');
    // Every injected <style>/<script> carries the nonce; none is left bare.
    expect(output.match(/<style(?![^>]*\bnonce=)/g)).toBeNull();
    expect(output.match(/<script(?![^>]*\bnonce=)/g)).toBeNull();
  });

  it("streams bare style/script tags when no nonce is configured", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        loader: () => Promise.resolve("data"),
        page: () => ({ h1: "Streamed" }),
      },
    ]);
    const app = createApp(routes, { history: null });
    const { stream } = await app.renderToStream("/");

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let output = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value);
    }

    expect(output).toContain('<style id="domphy-style">');
    expect(output).not.toContain("nonce");
  });
});

describe("hydrate", () => {
  it("mounts server markup without re-running loaders", async () => {
    const serverApp = createApp(buildRoutes(), { history: null });
    const result = await serverApp.renderToString("/blog/hello");
    expect(loaderRuns).toBe(1);

    const container = document.createElement("div");
    container.innerHTML = result.html;
    document.body.appendChild(container);
    const root = container.firstElementChild as HTMLElement;

    (globalThis as Record<string, unknown>).__DOMPHY_APP_DATA__ = result.data;
    window.history.replaceState(null, "", "/blog/hello");

    const clientApp = createApp(buildRoutes());
    await clientApp.hydrate(root);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(loaderRuns).toBe(1);
    expect(container.textContent).toContain("Post hello");
    expect(clientApp.router.state.get("pathname")).toBe("/blog/hello");

    clientApp.destroy();
    container.remove();
  });

  it("does not duplicate head tags after hydration", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        page: () => ({ h1: "Home" }),
        metadata: { title: "Home", description: "Home page" },
      },
    ]);
    const serverApp = createApp(routes, { history: null });
    const result = await serverApp.renderToString("/");
    // The SSR head set is stamped as managed so the client can replace it.
    expect(result.head).toContain("data-domphy-head");

    document.head.innerHTML = result.head;
    expect(
      document.head.querySelectorAll('meta[name="description"]').length,
    ).toBe(1);

    const container = document.createElement("div");
    container.innerHTML = result.html;
    document.body.appendChild(container);
    const root = container.firstElementChild as HTMLElement;

    (globalThis as Record<string, unknown>).__DOMPHY_APP_DATA__ = result.data;
    window.history.replaceState(null, "", "/");

    const clientApp = createApp(routes);
    await clientApp.hydrate(root);
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Hydration replaces the SSR set instead of appending next to it.
    expect(
      document.head.querySelectorAll('meta[name="description"]').length,
    ).toBe(1);
    expect(document.title).toBe("Home");

    clientApp.destroy();
    container.remove();
  });
});

describe("concurrent renderToString", () => {
  it("binds navLink to the request's own router while renders interleave", async () => {
    let releaseA!: () => void;
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    const nav = () => ({
      nav: [
        { a: "A", $: [navLink({ href: "/a", prefetch: false })] },
        { a: "B", $: [navLink({ href: "/b", prefetch: false })] },
      ],
    });
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "a",
            // Request A parks inside its loader until B has fully rendered.
            loader: async () => {
              await gateA;
              return null;
            },
            page: nav,
          },
          { path: "b", page: nav },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });

    const promiseA = app.renderToString("/a");
    await new Promise((resolve) => setTimeout(resolve, 10));
    const resultB = await app.renderToString("/b");
    releaseA();
    const resultA = await promiseA;

    const activeHref = (html: string) => {
      const anchors = html.match(/<a\b[^>]*>/g) ?? [];
      return anchors
        .filter((tag) => tag.includes('aria-current="page"'))
        .map((tag) => tag.match(/href="([^"]*)"/)?.[1]);
    };
    // Each request's active state resolves against its own router, not the
    // module-global default left over by the other in-flight request.
    expect(activeHref(resultA.html)).toEqual(["/a"]);
    expect(activeHref(resultB.html)).toEqual(["/b"]);
  });
});

describe("middleware rewrite loops", () => {
  it("fails with an actionable error instead of unbounded recursion", async () => {
    const routes = defineRoutes([
      {
        path: "/",
        children: [
          {
            path: "a",
            middleware: [() => rewrite("/b")],
            page: () => ({ h1: "A" }),
          },
          {
            path: "b",
            middleware: [() => rewrite("/a")],
            page: () => ({ h1: "B" }),
          },
        ],
      },
    ]);
    const app = createApp(routes, { history: null });
    const result = await app.renderToString("/a");
    expect(result.html).toContain("Rewrite loop detected");
  });
});
