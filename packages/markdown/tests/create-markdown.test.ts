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

  it("accepts custom markdown-it plugins via the plugins option", () => {
    // The plugin prepends a custom token by modifying core rules.
    // Here we just verify the plugin function is called and the parser works.
    let pluginCalled = false;
    const parser = createMarkdown({
      plugins: [
        (md) => {
          pluginCalled = true;
          // No-op plugin just to confirm the function is invoked.
          md.core.ruler.push("noop_test", () => {});
        },
      ],
    });
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
    // Both documents should produce the same slug because the slugger resets
    // per parse call.
    expect(first.toc[0].slug).toBe("intro");
    expect(second.toc[0].slug).toBe("intro");
  });
});

describe("createMarkdown math support", () => {
  it("renders inline math $...$ as a span.math.math-inline", () => {
    const parser = createMarkdown({ math: true });
    const body = parser.toDomphy("The formula $E = mc^2$ is famous.");
    const p = asRecord(body[0]);
    const children = p.p as unknown[];
    const mathEl = children.find(
      (c): c is Record<string, unknown> =>
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).class === "math math-inline",
    );
    expect(mathEl).toBeDefined();
    expect(mathEl?.span).toBe("E = mc^2");
  });

  it("renders display math $$...$$ as a div.math.math-display", () => {
    const parser = createMarkdown({ math: true });
    const body = parser.toDomphy("$$\nE = mc^2\n$$");
    const mathEl = asRecord(body[0]);
    expect(mathEl.class).toBe("math math-display");
    expect(mathEl.div as string).toContain("E = mc^2");
  });

  it("treats bare $ as literal text when there is no closing $", () => {
    const parser = createMarkdown({ math: true });
    const body = parser.toDomphy("Price: $100 and more.");
    const p = asRecord(body[0]);
    const text = (p.p as unknown[]).join("");
    expect(text).toContain("$100");
  });

  it("does not parse math when math option is false", () => {
    const parser = createMarkdown({ math: false });
    const body = parser.toDomphy("The formula $E = mc^2$ is famous.");
    const p = asRecord(body[0]);
    const children = p.p as unknown[];
    const hasMathEl = children.some(
      (c): c is Record<string, unknown> =>
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).class === "math math-inline",
    );
    // Without the math plugin, $...$ is treated as plain text
    expect(hasMathEl).toBe(false);
  });
});

describe("createMarkdown task list support", () => {
  it("renders checked task list items with a checked disabled checkbox", () => {
    const parser = createMarkdown({ tasklists: true });
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
    const parser = createMarkdown({ tasklists: true });
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
    const parser = createMarkdown({ tasklists: true });
    const body = parser.toDomphy("- [x] Deploy release");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    // Text should be the remaining content after [x]
    const textParts = liChildren
      .filter((c) => typeof c === "string")
      .join("");
    expect(textParts).toContain("Deploy release");
  });

  it("does not affect regular list items without the task prefix", () => {
    const parser = createMarkdown({ tasklists: true });
    const body = parser.toDomphy("- Normal item");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    const firstItem = asRecord(items[0]);
    const liChildren = firstItem.li as unknown[];
    // No checkbox element should be present
    const hasCheckbox = liChildren.some(
      (c): c is Record<string, unknown> =>
        typeof c === "object" &&
        c !== null &&
        (c as Record<string, unknown>).input === null &&
        (c as Record<string, unknown>).type === "checkbox",
    );
    expect(hasCheckbox).toBe(false);
  });

  it("handles mixed task and non-task items in the same list", () => {
    const parser = createMarkdown({ tasklists: true });
    const body = parser.toDomphy("- [x] Done\n- [ ] Todo\n- Normal");
    const ul = asRecord(body[0]);
    const items = ul.ul as Record<string, unknown>[];
    expect(items).toHaveLength(3);
  });
});
