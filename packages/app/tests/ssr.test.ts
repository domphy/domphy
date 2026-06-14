// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  createApp,
  defineRoutes,
  type Route,
  type RouteContext,
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
  delete (globalThis as Record<string, unknown>).__DOMPHY_APP_DATA__;
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
});
