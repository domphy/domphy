import type { DomphyElement } from "@domphy/core";
import { describe, expect, it, vi } from "vitest";
import { renderMermaidInTree } from "../src/tree.js";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe("renderMermaidInTree marker variants", () => {
  it("replaces a bare <code> mermaid block with no <pre> wrapper", async () => {
    const renderer = vi.fn(async (code: string) => `<svg>${code}</svg>`);
    const input: DomphyElement[] = [
      {
        code: "graph TD; A--&gt;B;",
        dataLanguage: "mermaid",
        class: "language-mermaid",
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });

    const replaced = asRecord(output[0]);
    expect(replaced.div).toBe("<svg>graph TD; A-->B;</svg>");
    expect(replaced.class).toBe("mermaid");
  });

  it('matches the language marker case-insensitively (dataLanguage "Mermaid")', async () => {
    const renderer = vi.fn(async () => "<svg>cased</svg>");
    const input: DomphyElement[] = [
      {
        pre: [{ code: "graph TD; A--&gt;B;", dataLanguage: "Mermaid" }],
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });
    expect(asRecord(output[0]).div).toBe("<svg>cased</svg>");
  });

  it("matches a class that carries the marker among other tokens", async () => {
    const renderer = vi.fn(async () => "<svg>extra</svg>");
    const input: DomphyElement[] = [
      {
        pre: [{ code: "graph TD;", class: "language-mermaid foo" }],
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });
    expect(asRecord(output[0]).div).toBe("<svg>extra</svg>");
  });

  it("skips an empty mermaid block, leaving it unchanged", async () => {
    const renderer = vi.fn(async () => "<svg>EMPTY</svg>");
    const input: DomphyElement[] = [
      {
        pre: [{ code: "", dataLanguage: "mermaid", class: "language-mermaid" }],
      } as DomphyElement,
    ];

    const output = await renderMermaidInTree(input, { renderer });
    // An empty source is falsy, so it is never collected and the renderer is
    // never called; the block is returned untouched.
    expect(renderer).not.toHaveBeenCalled();
    expect(output).toBe(input);
  });

  it("propagates a renderer rejection", async () => {
    const renderer = vi.fn(async () => {
      throw new Error("render failed");
    });
    const input: DomphyElement[] = [
      {
        pre: [
          {
            code: "graph TD; A--&gt;B;",
            dataLanguage: "mermaid",
            class: "language-mermaid",
          },
        ],
      } as DomphyElement,
    ];

    await expect(renderMermaidInTree(input, { renderer })).rejects.toThrow(
      "render failed",
    );
  });
});
