import { describe, expect, it } from "vitest";
import { compileRoutes, matchRoute } from "../src/matcher";
import {
  buildTree,
  defaultErrorBlock,
  defaultNotFoundBlock,
} from "../src/tree";
import type { Route } from "../src/types";

function pageKey(pathname: string): string | number | undefined {
  const routes: Route[] = [
    {
      path: "blog/[slug]",
      page: ({ params }) => ({ h1: String(params.slug) }),
    },
  ];
  const match = matchRoute(compileRoutes(routes), pathname);
  if (!match) throw new Error(`no match for ${pathname}`);
  return buildTree({
    match,
    baseContext: {
      pathname: match.pathname,
      url: pathname,
      params: match.params,
      searchParams: new URLSearchParams(),
      hash: "",
    },
    results: [{ status: "success", data: undefined }],
    retry: () => {},
    defaultError: defaultErrorBlock,
    defaultNotFound: defaultNotFoundBlock,
  }).element._key;
}

describe("buildTree page _key", () => {
  it("includes param identity so distinct params do not reuse a node", () => {
    const hello = pageKey("/blog/hello");
    const world = pageKey("/blog/world");
    expect(hello).toBeDefined();
    expect(hello).not.toBe(world);
    expect(hello).toBe(pageKey("/blog/hello"));
    expect(String(hello)).toContain("hello");
    expect(String(world)).toContain("world");
  });
});
