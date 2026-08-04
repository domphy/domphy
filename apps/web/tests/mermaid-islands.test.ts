// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MermaidBrowserModule,
  renderMermaidBlocks,
} from "../islands-runtime.ts";

// jsdom has no IntersectionObserver — stub one that fires "visible"
// immediately on observe, so blocks render without scrolling.
class FakeIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

interface FakeMermaid {
  lib: MermaidBrowserModule;
  configs: Record<string, unknown>[];
  sources: string[];
}

function fakeMermaid(svgFor: (callIndex: number) => string): FakeMermaid {
  const configs: Record<string, unknown>[] = [];
  const sources: string[] = [];
  let renderCount = 0;
  const lib: MermaidBrowserModule = {
    initialize: (config) => {
      configs.push(config);
    },
    render: async (_id, text) => {
      sources.push(text);
      return { svg: svgFor(renderCount++) };
    },
  };
  return { lib, configs, sources };
}

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
});

describe("renderMermaidBlocks", () => {
  it("pins securityLevel strict and sanitizes the rendered SVG before innerHTML", async () => {
    document.body.innerHTML =
      '<pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>';
    const { lib, configs, sources } = fakeMermaid(
      () =>
        "<svg onload=alert(1)><script>alert(2)</script><text>hi</text></svg>",
    );

    await renderMermaidBlocks(async () => lib);
    await flush();
    await flush();

    const wrapper = document.querySelector("div.mermaid");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.innerHTML).toContain("<text>hi</text>");
    expect(wrapper?.innerHTML).not.toContain("<script");
    expect(wrapper?.innerHTML).not.toContain("onload");
    expect(configs[0]).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
    expect(sources[0]).toBe("graph TD; A-->B;");
    // The source <pre> is replaced, not left alongside the diagram.
    expect(document.querySelector("pre")).toBeNull();
  });

  it("re-renders rendered diagrams with the new theme on [data-theme] flips", async () => {
    document.body.innerHTML =
      '<pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>';
    const { lib, configs } = fakeMermaid(
      (call) => `<svg data-render="${call}"></svg>`,
    );

    await renderMermaidBlocks(async () => lib);
    await flush();
    await flush();
    expect(document.querySelector("div.mermaid")?.innerHTML).toContain(
      'data-render="0"',
    );

    document.documentElement.setAttribute("data-theme", "dark");
    await flush();
    await flush();

    expect(document.querySelector("div.mermaid")?.innerHTML).toContain(
      'data-render="1"',
    );
    expect(configs.at(-1)).toMatchObject({
      securityLevel: "strict",
      theme: "dark",
    });
  });

  it("leaves the source block in place when rendering fails", async () => {
    document.body.innerHTML =
      '<pre><code class="language-mermaid">not a diagram</code></pre>';
    const lib: MermaidBrowserModule = {
      initialize: () => {},
      render: async () => {
        throw new Error("syntax error");
      },
    };
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderMermaidBlocks(async () => lib);
    await flush();
    await flush();

    expect(document.querySelector("pre")).not.toBeNull();
    expect(document.querySelector("div.mermaid")).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
