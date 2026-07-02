import type { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MermaidBrowserModule, makeMermaidClient } from "../src/client.js";

/**
 * Minimal stand-in for the DOM element the client patch writes into. It records
 * the values the patch sets so assertions do not need a real DOM. Only the
 * members the client touches are implemented.
 */
interface FakeHost {
  innerHTML: string;
  classes: Set<string>;
  attributes: Map<string, string>;
  codeText: string | null;
  textContent: string;
  querySelector(selector: string): { textContent: string } | null;
  classList: { add(name: string): void };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
}

/** Builds a fake host element, optionally with an inner `<code>` text. */
function makeHost(text: string, codeText: string | null = null): FakeHost {
  const host: FakeHost = {
    innerHTML: "",
    classes: new Set<string>(),
    attributes: new Map<string, string>(),
    codeText,
    textContent: text,
    querySelector(selector: string) {
      if (selector === "code" && this.codeText !== null) {
        return { textContent: this.codeText };
      }
      return null;
    },
    classList: {
      add: (name: string) => {
        host.classes.add(name);
      },
    },
    getAttribute(name: string) {
      return this.attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    },
  };
  return host;
}

/** Wraps a fake host as the `node` argument the lifecycle hook receives. */
function nodeFor(host: FakeHost): ElementNode {
  return { domElement: host } as unknown as ElementNode;
}

/** Builds a fake `mermaid` browser module backed by the supplied render fn. */
function fakeMermaid(render: MermaidBrowserModule["render"]): {
  module: MermaidBrowserModule;
  initialize: ReturnType<typeof vi.fn>;
} {
  const initialize = vi.fn();
  return {
    module: { initialize, render },
    initialize,
  };
}

describe("makeMermaidClient", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("initializes mermaid and swaps the host innerHTML with the rendered SVG", async () => {
    const render = vi.fn(async () => ({ svg: "<svg>ok</svg>" }));
    const { module, initialize } = fakeMermaid(render);

    const host = makeHost("graph TD; A-->B;");
    const patch = makeMermaidClient(() => module, { theme: "dark" });

    patch._onMount?.(nodeFor(host));
    // Let the render promise chain settle.
    await vi.waitFor(() => expect(host.innerHTML).toBe("<svg>ok</svg>"));

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, theme: "dark" }),
    );
    expect(render).toHaveBeenCalledWith(expect.any(String), "graph TD; A-->B;");
    expect(host.classes.has("mermaid")).toBe(true);
    expect(host.getAttribute("aria-label")).toBe("diagram");
  });

  it("reads the source from an inner <code> element when present", async () => {
    const render = vi.fn(async () => ({ svg: "<svg/>" }));
    const { module } = fakeMermaid(render);

    // The host's own text differs from the inner <code> text; the code wins.
    const host = makeHost("HOST TEXT", "sequenceDiagram; A->>B: hi");
    const patch = makeMermaidClient(() => module, {});

    patch._onMount?.(nodeFor(host));
    await vi.waitFor(() => expect(host.innerHTML).toBe("<svg/>"));

    expect(render).toHaveBeenCalledWith(
      expect.any(String),
      "sequenceDiagram; A->>B: hi",
    );
  });

  it("does nothing when the source is empty or whitespace only", () => {
    const render = vi.fn(async () => ({ svg: "<svg/>" }));
    const { module } = fakeMermaid(render);

    const host = makeHost("   \n  ");
    const patch = makeMermaidClient(() => module, {});

    patch._onMount?.(nodeFor(host));
    expect(render).not.toHaveBeenCalled();
  });

  it("logs the failure and does not throw when the renderer rejects", async () => {
    const render = vi.fn(async () => {
      throw new Error("boom");
    });
    const { module } = fakeMermaid(render);

    const host = makeHost("graph TD; A-->B;");
    const patch = makeMermaidClient(() => module, {});

    expect(() => patch._onMount?.(nodeFor(host))).not.toThrow();
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

    // The host content is left untouched on failure.
    expect(host.innerHTML).toBe("");
    const logged = String(errorSpy.mock.calls[0]?.[0] ?? "");
    expect(logged).toContain("boom");
    expect(logged).toContain("graph TD; A-->B;");
  });

  it("strips on* handlers and javascript: URLs from the rendered SVG before writing innerHTML", async () => {
    const malicious =
      '<svg onload="alert(1)"><a href="javascript:alert(2)">x</a></svg>';
    const render = vi.fn(async () => ({ svg: malicious }));
    const { module } = fakeMermaid(render);

    const host = makeHost("graph TD; A-->B;");
    const patch = makeMermaidClient(() => module, {});

    patch._onMount?.(nodeFor(host));
    await vi.waitFor(() => expect(host.innerHTML).not.toBe(""));

    expect(host.innerHTML).not.toContain("onload");
    expect(host.innerHTML).not.toContain("javascript:");
  });

  it("does NOT write the SVG when the node is removed before the render resolves", async () => {
    // Render resolves on the next microtask; the disposed guard must stop the
    // late `.then` from writing into a torn-down host.
    let resolveRender: (value: { svg: string }) => void = () => {};
    const render = vi.fn(
      () =>
        new Promise<{ svg: string }>((resolve) => {
          resolveRender = resolve;
        }),
    );
    const { module } = fakeMermaid(render);

    const host = makeHost("graph TD; A-->B;");
    const patch = makeMermaidClient(() => module, {});

    patch._onMount?.(nodeFor(host));
    // Tear the node down while the render is still in flight.
    patch._onRemove?.(nodeFor(host));
    // Now resolve the render; the guard must skip the write.
    resolveRender({ svg: "<svg>late</svg>" });
    // Give the promise chain a chance to run.
    await Promise.resolve();
    await Promise.resolve();

    expect(host.innerHTML).toBe("");
    expect(host.classes.has("mermaid")).toBe(false);
  });
});
