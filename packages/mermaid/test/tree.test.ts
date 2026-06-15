import { describe, expect, it, vi } from "vitest";
import type { DomphyElement } from "@domphy/core";
import { renderMermaidInTree } from "../src/tree.js";

/**
 * Builds the exact shape `@domphy/markdown` emits for a fenced ```mermaid block:
 * a <pre> wrapping a single <code> whose content is the escaped diagram source.
 */
function mermaidBlock(source: string): DomphyElement {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return {
    pre: [
      {
        code: escaped,
        dataLanguage: "mermaid",
        class: "language-mermaid",
      },
    ],
  } as DomphyElement;
}

describe("renderMermaidInTree", () => {
  it("replaces a mermaid block with the SVG wrapper and leaves siblings intact", async () => {
    const renderer = vi.fn(async (code: string) => `<svg data-src="${code}"></svg>`);

    const input: DomphyElement[] = [
      { h1: "Title" } as DomphyElement,
      { p: "Intro paragraph" } as DomphyElement,
      mermaidBlock("graph TD; A-->B;"),
      {
        pre: [{ code: "const x = 1;", dataLanguage: "ts", class: "language-ts" }],
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });

    // Non-mermaid nodes are unchanged (same references / values).
    expect(output[0]).toEqual({ h1: "Title" });
    expect(output[1]).toEqual({ p: "Intro paragraph" });
    expect(output[3]).toEqual({
      pre: [{ code: "const x = 1;", dataLanguage: "ts", class: "language-ts" }],
    });

    // The mermaid block becomes a div carrying the inline SVG string.
    const replaced = output[2] as Record<string, unknown>;
    expect(replaced.div).toBe('<svg data-src="graph TD; A-->B;"></svg>');
    expect(replaced.class).toBe("mermaid");
    expect(replaced.ariaLabel).toBe("diagram");

    // The renderer received the unescaped source.
    expect(renderer).toHaveBeenCalledWith("graph TD; A-->B;", expect.anything());
  });

  it("preserves nesting and replaces mermaid blocks deep in the tree", async () => {
    const renderer = vi.fn(async () => "<svg>deep</svg>");

    const input: DomphyElement[] = [
      {
        section: [
          { h2: "Section" } as DomphyElement,
          {
            div: [mermaidBlock("sequenceDiagram; A->>B: hi")],
          } as DomphyElement,
        ],
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });

    const section = output[0] as Record<string, unknown>;
    const sectionChildren = section.section as Record<string, unknown>[];
    expect(sectionChildren[0]).toEqual({ h2: "Section" });

    const innerDiv = sectionChildren[1] as Record<string, unknown>;
    const innerChildren = innerDiv.div as Record<string, unknown>[];
    expect(innerChildren[0].div).toBe("<svg>deep</svg>");
    expect(innerChildren[0].class).toBe("mermaid");
  });

  it("de-dupes identical sources, rendering each only once", async () => {
    const renderer = vi.fn(async (code: string) => `<svg>${code.length}</svg>`);

    const same = "graph TD; X-->Y;";
    const input: DomphyElement[] = [
      mermaidBlock(same),
      { p: "between" } as DomphyElement,
      mermaidBlock(same),
    ];

    const output = await renderMermaidInTree(input, { renderer });

    expect(renderer).toHaveBeenCalledTimes(1);
    expect((output[0] as Record<string, unknown>).div).toBe("<svg>16</svg>");
    expect((output[2] as Record<string, unknown>).div).toBe("<svg>16</svg>");
  });

  it("supports custom className and ariaLabel", async () => {
    const renderer = vi.fn(async () => "<svg/>");
    const output = await renderMermaidInTree([mermaidBlock("graph TD; A-->B;")], {
      renderer,
      className: "diagram-box",
      ariaLabel: "flow chart",
    });
    const replaced = output[0] as Record<string, unknown>;
    expect(replaced.class).toBe("diagram-box");
    expect(replaced.ariaLabel).toBe("flow chart");
  });

  it("returns the input untouched when there are no mermaid blocks", async () => {
    const renderer = vi.fn(async () => "<svg/>");
    const input: DomphyElement[] = [
      { h1: "No diagrams" } as DomphyElement,
      { p: "just text" } as DomphyElement,
    ];
    const output = await renderMermaidInTree(input, { renderer });
    expect(output).toBe(input);
    expect(renderer).not.toHaveBeenCalled();
  });
});
