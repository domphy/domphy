import { beforeAll, describe, expect, it } from "vitest";
import { buildSearchIndex, queryIndex } from "../src/search.ts";
import type { SearchDocument } from "../src/types.ts";

const docs: SearchDocument[] = [
  {
    route: "/core",
    title: "Core",
    text: "The runtime of Domphy. Turns plain objects into DOM nodes.",
    toc: [
      { text: "Overview", slug: "overview", level: 2 },
      { text: "Reactivity", slug: "reactivity", level: 2 },
    ],
  },
  {
    route: "/theme",
    title: "Theme",
    text: "Design tokens and tone model.",
    toc: [],
  },
];

describe("buildSearchIndex", () => {
  it("returns valid JSON", () => {
    const index = buildSearchIndex(docs);
    expect(() => JSON.parse(index)).not.toThrow();
  });

  it("index contains entries for each doc and its toc sections", () => {
    const index = JSON.parse(buildSearchIndex(docs));
    const routes = index.entries.map((e: { route: string }) => e.route);
    expect(routes.filter((r: string) => r === "/core").length).toBeGreaterThanOrEqual(1);
    expect(routes.filter((r: string) => r === "/theme").length).toBeGreaterThanOrEqual(1);
  });

  it("has postings for terms in the docs", () => {
    const index = JSON.parse(buildSearchIndex(docs));
    expect(Object.keys(index.postings).length).toBeGreaterThan(0);
  });
});

describe("queryIndex", () => {
  let index: string;

  beforeAll(() => {
    index = buildSearchIndex(docs);
  });

  it("finds docs by title term", () => {
    const results = queryIndex(index, "core");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].route).toBe("/core");
  });

  it("returns empty array for empty query", () => {
    expect(queryIndex(index, "")).toEqual([]);
  });

  it("finds docs by body text", () => {
    const results = queryIndex(index, "tokens");
    expect(results.some((r) => r.route === "/theme")).toBe(true);
  });

  it("finds toc sections by heading text", () => {
    const results = queryIndex(index, "reactivity");
    expect(results.some((r) => r.slug === "reactivity")).toBe(true);
  });

  it("respects the limit parameter", () => {
    const results = queryIndex(index, "domphy", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("supports prefix matching", () => {
    const results = queryIndex(index, "react");
    expect(results.some((r) => r.slug === "reactivity")).toBe(true);
  });
});
