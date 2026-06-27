import type { Root } from "mdast";
import type { Plugin } from "unified";
import { describe, expect, it } from "vitest";
import { createMarkdown } from "../src/index";

/** Narrows an unknown element to a record for assertion ergonomics. */
function asRecord(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe("createMarkdown", () => {
  it("returns the same parse result shape as parseMarkdown", () => {
    const parser = createMarkdown();
    const { frontmatter, body, toc } = parser.parse(
      "---\ntitle: Test\n---\n# Hello\n\nParagraph.",
    );
    expect(frontmatter).toEqual({ title: "Test" });
    expect(toc).toEqual([{ level: 1, text: "Hello", slug: "hello" }]);
    expect(asRecord(body[0]).h1).toBeDefined();
    expect(asRecord(body[1]).p).toBeDefined();
  });

  it("toDomphy returns only the body array", () => {
    const parser = createMarkdown();
    const body = parser.toDomphy("# Title");
    expect(asRecord(body[0]).h1).toBeDefined();
  });

  it("accepts remark plugins via the plugins option", () => {
    let pluginCalled = false;
    // A remark plugin is a function that returns a transformer
    const testPlugin: Plugin<[], Root> = () => () => {
      pluginCalled = true;
    };
    const parser = createMarkdown({ plugins: [testPlugin] });
    const body = parser.toDomphy("Hello");
    expect(pluginCalled).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("passes highlight option through to the walker", () => {
    const parser = createMarkdown({
      highlight: (code) => `<em>${code}</em>`,
    });
    const body = parser.toDomphy("```ts\nconst x = 1\n```");
    const pre = asRecord(body[0]);
    const code = asRecord((pre.pre as unknown[])[0]);
    expect(code.code as string).toContain("<em>");
  });

  it("each .parse() call uses independent sluggers (no cross-call state leak)", () => {
    const parser = createMarkdown();
    const first = parser.parse("# Intro");
    const second = parser.parse("# Intro");
    expect(first.toc[0].slug).toBe("intro");
    expect(second.toc[0].slug).toBe("intro");
  });

  it("info string (lang + meta) is passed to the highlight callback", () => {
    const infos: string[] = [];
    const parser = createMarkdown({
      highlight: (code, info) => {
        infos.push(info);
        return null;
      },
    });
    parser.toDomphy("```ts :line-numbers\nconst x = 1;\n```");
    expect(infos[0]).toBe("ts :line-numbers");
  });
});

describe("createMarkdown task list support (remark-gfm built-in)", () => {
  it("renders checked task list items with a checked disabled checkbox", () => {
    const parser = createMarkdown();
    const body = parser.toDomphy("- [x] Done");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    const checkbox = asRecord(liChildren[0]);
    expect(checkbox.input).toBeNull();
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBe(true);
  });

  it("renders unchecked task list items with an unchecked disabled checkbox", () => {
    const parser = createMarkdown();
    const body = parser.toDomphy("- [ ] Todo");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    const checkbox = asRecord(liChildren[0]);
    expect(checkbox.input).toBeNull();
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.disabled).toBe(true);
    expect(checkbox.checked).toBeUndefined();
  });

  it("leaves the item text after stripping the task prefix", () => {
    const parser = createMarkdown();
    const body = parser.toDomphy("- [x] Deploy release");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    const textParts = liChildren
      .filter((c) => typeof c === "string")
      .join("");
    expect(textParts).toContain("Deploy release");
  });

  it("handles mixed task and non-task items in the same list", () => {
    const parser = createMarkdown();
    const body = parser.toDomphy("- [x] Done\n- [ ] Todo\n- Normal");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    expect(items).toHaveLength(3);
  });
});

describe("createMarkdown onCustom handler", () => {
  it("receives unrecognised MDAST nodes and can return a Domphy element", () => {
    // Simulate a directive-like node by using a plugin that adds custom nodes
    const fakeDirectivePlugin: Plugin<[], Root> = () => (tree: Root) => {
      // Inject a fake custom node as if from remark-directive
      tree.children.push({
        type: "containerDirective" as "html",
        // @ts-expect-error -- fake custom node for test
        name: "tip",
        children: [{ type: "paragraph", children: [{ type: "text", value: "content" }] }],
      });
    };

    const parser = createMarkdown({
      plugins: [fakeDirectivePlugin],
      onCustom: (node) => {
        // @ts-expect-error -- accessing custom node property
        if (node.type === "containerDirective" && node.name === "tip") {
          return { div: "tip content", class: "custom-block tip" } as never;
        }
        return null;
      },
    });

    const body = parser.toDomphy("# Test");
    const lastEl = asRecord(body[body.length - 1]);
    expect(lastEl.class).toBe("custom-block tip");
  });
});
