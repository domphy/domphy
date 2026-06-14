import { describe, expect, it } from "vitest";
import type { Route } from "../src/index";
import {
  buildHref,
  compileRoutes,
  matchRoute,
  parseSegment,
} from "../src/index";

const page = () => ({ div: "page" });

describe("parseSegment", () => {
  it("classifies segment kinds", () => {
    expect(parseSegment("about")).toEqual({ kind: "static", value: "about" });
    expect(parseSegment("[slug]")).toEqual({ kind: "dynamic", value: "slug" });
    expect(parseSegment("[...slug]")).toEqual({
      kind: "catchall",
      value: "slug",
    });
    expect(parseSegment("[[...slug]]")).toEqual({
      kind: "optional-catchall",
      value: "slug",
    });
    expect(parseSegment("(shop)")).toEqual({ kind: "group", value: "shop" });
  });
});

describe("compileRoutes + matchRoute", () => {
  const routes: Route[] = [
    {
      path: "/",
      page,
      children: [
        { path: "about", page },
        {
          path: "blog",
          page,
          children: [{ path: "[slug]", page }],
        },
        { path: "docs/[...parts]", page },
        { path: "gallery/[[...parts]]", page },
        {
          path: "(marketing)",
          children: [{ path: "pricing", page }],
        },
        { path: "users/[id]/posts/[postId]", page },
      ],
    },
  ];
  const compiled = compileRoutes(routes);

  it("matches the index route", () => {
    const match = matchRoute(compiled, "/");
    expect(match?.route.id).toBe("/");
    expect(match?.params).toEqual({});
  });

  it("matches static routes", () => {
    expect(matchRoute(compiled, "/about")?.route.id).toBe("/about");
  });

  it("matches dynamic segments", () => {
    const match = matchRoute(compiled, "/blog/hello-world");
    expect(match?.params).toEqual({ slug: "hello-world" });
  });

  it("decodes URI components in params", () => {
    const match = matchRoute(compiled, "/blog/hello%20world");
    expect(match?.params).toEqual({ slug: "hello world" });
  });

  it("prefers static over dynamic siblings", () => {
    const both = compileRoutes([
      { path: "blog/featured", page },
      { path: "blog/[slug]", page },
    ]);
    expect(matchRoute(both, "/blog/featured")?.route.id).toBe("/blog/featured");
    expect(matchRoute(both, "/blog/other")?.route.id).toBe("/blog/[slug]");
  });

  it("matches catch-all segments", () => {
    const match = matchRoute(compiled, "/docs/getting-started/install");
    expect(match?.params).toEqual({ parts: ["getting-started", "install"] });
    expect(matchRoute(compiled, "/docs")).toBeNull();
  });

  it("matches optional catch-all segments with and without parts", () => {
    expect(matchRoute(compiled, "/gallery")?.params).toEqual({ parts: [] });
    expect(matchRoute(compiled, "/gallery/a/b")?.params).toEqual({
      parts: ["a", "b"],
    });
  });

  it("ignores route groups in the URL", () => {
    expect(matchRoute(compiled, "/pricing")?.route.id).toBe(
      "/(marketing)/pricing",
    );
    expect(matchRoute(compiled, "/(marketing)/pricing")).toBeNull();
  });

  it("matches multiple dynamic params in one path", () => {
    const match = matchRoute(compiled, "/users/7/posts/42");
    expect(match?.params).toEqual({ id: "7", postId: "42" });
  });

  it("returns null for unknown paths", () => {
    expect(matchRoute(compiled, "/missing")).toBeNull();
  });

  it("records the chain from root to leaf", () => {
    const match = matchRoute(compiled, "/blog/post");
    expect(match?.route.chain.length).toBe(3);
    expect(match?.route.chainIds).toEqual(["/", "/blog", "/blog/[slug]"]);
  });
});

describe("buildHref", () => {
  it("fills params into patterns", () => {
    expect(buildHref("/blog/[slug]", { slug: "hello" })).toBe("/blog/hello");
    expect(buildHref("/docs/[...parts]", { parts: ["a", "b"] })).toBe(
      "/docs/a/b",
    );
    expect(buildHref("/(shop)/items/[id]", { id: "1" })).toBe("/items/1");
    expect(buildHref("/gallery/[[...parts]]", {})).toBe("/gallery");
  });

  it("encodes param values", () => {
    expect(buildHref("/blog/[slug]", { slug: "hello world" })).toBe(
      "/blog/hello%20world",
    );
  });

  it("throws on missing params", () => {
    expect(() => buildHref("/blog/[slug]", {})).toThrow();
  });
});
