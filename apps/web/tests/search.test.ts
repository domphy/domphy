// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchIndex,
  mountSearch,
  queryIndex,
  searchWidget,
} from "@domphy/press";
import type { SearchDocument } from "@domphy/press";

// A small, hand-authored corpus. "Reactivity" appears as a page title on one
// page and only in the body of another, so a title match can be checked to
// outrank a body match. Headings carry slugs so deep-link resolution is testable.
const docs: SearchDocument[] = [
  {
    route: "/docs/core/reactivity",
    title: "Reactivity",
    text: "State drives the view. Events write the next state. One-way data flow.",
    toc: [
      { level: 2, text: "Listener based", slug: "listener-based" },
      { level: 2, text: "Reactive children", slug: "reactive-children" },
    ],
  },
  {
    route: "/docs/core/syntax",
    title: "Element Syntax",
    text: "An element is a plain object. Reactivity is added through reactive functions.",
    toc: [{ level: 2, text: "Element shape", slug: "element-shape" }],
  },
  {
    route: "/docs/theme/colors",
    title: "Theme Colors",
    text: "Color families map to ramps. Use themeColor to resolve a tone.",
    toc: [{ level: 2, text: "Tone hierarchy", slug: "tone-hierarchy" }],
  },
];

describe("buildSearchIndex + queryIndex", () => {
  it("produces deterministic output for the same input", () => {
    expect(buildSearchIndex(docs)).toBe(buildSearchIndex(docs));
  });

  it("ranks a title match above a body-only match", () => {
    const index = buildSearchIndex(docs);
    const results = queryIndex(index, "reactivity");

    // The page whose TITLE is "Reactivity" must come before the page that only
    // mentions reactivity in its body.
    const reactivityPage = results.findIndex(
      (r) => r.route === "/docs/core/reactivity" && r.isPage,
    );
    const syntaxPage = results.findIndex(
      (r) => r.route === "/docs/core/syntax" && r.isPage,
    );
    expect(reactivityPage).toBeGreaterThanOrEqual(0);
    expect(syntaxPage).toBeGreaterThanOrEqual(0);
    expect(reactivityPage).toBeLessThan(syntaxPage);
  });

  it("returns heading-level results that carry the right slug and deep-link href", () => {
    const index = buildSearchIndex(docs);
    const results = queryIndex(index, "tone hierarchy");

    const heading = results.find(
      (r) => !r.isPage && r.heading === "Tone hierarchy",
    );
    expect(heading).toBeDefined();
    expect(heading?.slug).toBe("tone-hierarchy");
    expect(heading?.route).toBe("/docs/theme/colors");
    expect(heading?.href).toBe("/docs/theme/colors#tone-hierarchy");
  });

  it("links a page-level result to the route without a fragment", () => {
    const index = buildSearchIndex(docs);
    const page = queryIndex(index, "syntax").find((r) => r.isPage);
    expect(page?.href).toBe("/docs/core/syntax");
  });

  it("supports prefix matching for partial words", () => {
    const index = buildSearchIndex(docs);
    const results = queryIndex(index, "react");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.route === "/docs/core/reactivity")).toBe(true);
  });

  it("returns nothing for an empty query", () => {
    const index = buildSearchIndex(docs);
    expect(queryIndex(index, "")).toEqual([]);
    expect(queryIndex(index, "   ")).toEqual([]);
  });

  it("honors the result limit", () => {
    const index = buildSearchIndex(docs);
    expect(
      queryIndex(index, "reactivity element theme", 2).length,
    ).toBeLessThanOrEqual(2);
  });
});

describe("searchWidget", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function flush(): Promise<void> {
    return new Promise((r) => setTimeout(r, 0));
  }

  it("fetches the index on mount and renders result deep links as the user types", async () => {
    const serialized = buildSearchIndex(docs);
    globalThis.fetch = vi.fn(async () => ({
      text: async () => serialized,
    })) as unknown as typeof globalThis.fetch;

    const host = document.createElement("div");
    document.body.appendChild(host);

    mountSearch(host);
    await flush();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const input = host.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Simulate typing a query.
    input.value = "tone hierarchy";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Wait past the input debounce, then let reactive updates settle.
    await new Promise((r) => setTimeout(r, 200));
    await flush();

    const links = Array.from(
      host.querySelectorAll('[role="option"]'),
    ) as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);

    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/docs/theme/colors#tone-hierarchy");
  });

  it("marks the combobox expanded once results are shown", async () => {
    const serialized = buildSearchIndex(docs);
    globalThis.fetch = vi.fn(async () => ({
      text: async () => serialized,
    })) as unknown as typeof globalThis.fetch;

    const host = document.createElement("div");
    document.body.appendChild(host);
    mountSearch(host);
    await flush();

    const input = host.querySelector("input") as HTMLInputElement;
    input.value = "reactivity";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    await flush();

    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("role")).toBe("combobox");
  });

  it("exposes searchWidget as a usable element factory", () => {
    const element = searchWidget({ placeholder: "Find" });
    expect(element).toHaveProperty("div");
    expect(element.role).toBe("search");
  });
});
