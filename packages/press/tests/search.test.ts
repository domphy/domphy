// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildSearchIndex, queryIndex, searchWidget } from "../src/search.ts";
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
    expect(
      routes.filter((r: string) => r === "/core").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      routes.filter((r: string) => r === "/theme").length,
    ).toBeGreaterThanOrEqual(1);
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

describe("searchWidget base handling", () => {
  async function mountAndQuery(options: {
    indexUrl: string;
    basePath?: string;
  }): Promise<{ host: HTMLElement; fetchMock: ReturnType<typeof vi.fn> }> {
    const index = buildSearchIndex(docs);
    const fetchMock = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(index),
    });
    vi.stubGlobal("fetch", fetchMock);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode(searchWidget(options));
    node.render(host);
    // Let the _onMount fetch resolve, then type a query (debounce is 120ms).
    await new Promise((resolve) => setTimeout(resolve, 20));
    const input = host.querySelector("input")!;
    input.value = "core";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { host, fetchMock };
  }

  it("fetches the configured indexUrl and prefixes result hrefs with basePath", async () => {
    const { host, fetchMock } = await mountAndQuery({
      indexUrl: "/docs/search-index.json",
      basePath: "/docs",
    });
    expect(fetchMock).toHaveBeenCalledWith("/docs/search-index.json");
    const hrefs = [...host.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/docs\//);
    expect(hrefs).toContain("/docs/core");
  });

  it("keeps root-relative hrefs when no basePath is given", async () => {
    const { host } = await mountAndQuery({ indexUrl: "/search-index.json" });
    const hrefs = [...host.querySelectorAll("a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/core");
  });
});

describe("searchWidget combobox aria contract", () => {
  // Local fixture with several matches for "button" so ArrowDown actually
  // moves the active option (the shared fixture's "core" query has exactly
  // one result and would wrap onto itself).
  const ariaDocs: SearchDocument[] = [
    {
      route: "/button",
      title: "Button",
      text: "The button component.",
      toc: [{ text: "Button variants", slug: "variants", level: 2 }],
    },
    {
      route: "/input",
      title: "Input",
      text: "Input with button addons.",
      toc: [],
    },
  ];

  async function mountAndQuery(): Promise<{
    host: HTMLElement;
    node: ElementNode;
  }> {
    const index = buildSearchIndex(ariaDocs);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ text: () => Promise.resolve(index) }),
    );
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode(searchWidget({}));
    node.render(host);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const input = host.querySelector("input")!;
    input.value = "button";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { host, node };
  }

  function pressKey(
    input: HTMLInputElement,
    key: string,
    init: KeyboardEventInit = {},
  ): void {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  }

  it("sets aria-activedescendant to the active option's id on ArrowDown and clears it on Escape", async () => {
    const { host } = await mountAndQuery();
    const input = host.querySelector("input")!;

    // No option active yet — the attribute must be absent entirely.
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    // Regression guard for the core name-mapping bug: the bogus
    // camelToKebab spelling must never appear either.
    expect(input.hasAttribute("aria-active-descendant")).toBe(false);

    pressKey(input, "ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    const activeOption = host.querySelector(
      `[role="option"][aria-selected="true"]`,
    );
    expect(activeOption).not.toBeNull();
    expect(activeOption!.id).toBe(activeId);

    pressKey(input, "ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const nextId = input.getAttribute("aria-activedescendant");
    expect(nextId).toBeTruthy();
    expect(nextId).not.toBe(activeId);

    pressKey(input, "Escape");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("every option has a stable id matching the aria-activedescendant target", async () => {
    const { host } = await mountAndQuery();
    const options = host.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);
    const ids = [...options].map((o) => o.id);
    for (const id of ids) expect(id).toMatch(/^dp-search-\d+-option-\d+$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("searchWidget Ctrl+K / Cmd+K shortcut", () => {
  async function mountWidget(): Promise<{
    host: HTMLElement;
    node: ElementNode;
  }> {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ text: () => Promise.resolve("{}") }),
    );
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode(searchWidget({}));
    node.render(host);
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { host, node };
  }

  it("Ctrl+K focuses the search input and selects existing text", async () => {
    const { host } = await mountWidget();
    const input = host.querySelector("input")!;
    input.value = "button";
    expect(document.activeElement).not.toBe(input);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("button".length);
  });

  it("Cmd+K (metaKey) focuses the search input", async () => {
    const { host } = await mountWidget();
    const input = host.querySelector("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );

    expect(document.activeElement).toBe(input);
  });

  it("does not leak the listener after the widget is removed", async () => {
    const { host, node } = await mountWidget();
    const input = host.querySelector("input")!;
    const focusSpy = vi.spyOn(input, "focus");
    node.remove();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    // A leaked document-level listener would still focus the detached input.
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
