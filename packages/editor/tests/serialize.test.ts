import { describe, expect, it } from "vitest";

import { Node } from "../src/Extendable.js";
import {
  generateHTML,
  parseDOMContent,
  parseHTML,
} from "../src/serialize/html.js";
import { fromJSON, toJSON } from "../src/serialize/json.js";
import { block, createTestEditor, docOf, h, p } from "./fixtures.js";

const editor = createTestEditor();
const schema = editor.schema;

describe("JSON normalization", () => {
  it("omits attrs when every attribute is default", () => {
    const document = fromJSON(schema, docOf(h(1, "Title")));
    expect(toJSON(schema, document)).toEqual({
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "Title" }] },
      ],
    });
  });

  it("keeps attrs that differ from the default", () => {
    const document = fromJSON(schema, docOf(h(3, "Title")));
    expect(toJSON(schema, document).content?.[0].attrs).toEqual({ level: 3 });
  });

  it("omits empty content arrays", () => {
    const document = fromJSON(schema, docOf(p()));
    expect(toJSON(schema, document)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("keeps marks on text nodes only", () => {
    const source = docOf(
      p({ type: "text", text: "bold", marks: [{ type: "bold" }] }),
    );
    const document = fromJSON(schema, source);
    expect(toJSON(schema, document).content?.[0].content?.[0]).toEqual({
      type: "text",
      text: "bold",
      marks: [{ type: "bold" }],
    });
  });

  it("round-trips JSON unchanged", () => {
    const source = docOf(
      h(2, "Title"),
      p("Hello ", { type: "text", text: "world", marks: [{ type: "italic" }] }),
    );
    expect(toJSON(schema, fromJSON(schema, source))).toEqual(source);
  });

  it("drops unknown node types and fills required content", () => {
    const document = fromJSON(
      schema,
      docOf({ type: "mystery", content: [{ type: "text", text: "x" }] }),
    );
    expect(toJSON(schema, document)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("wraps loose inline content into a paragraph", () => {
    const document = fromJSON(schema, [{ type: "text", text: "loose" }]);
    expect(toJSON(schema, document)).toEqual(docOf(p("loose")));
  });
});

describe("generateHTML", () => {
  it("renders nodes and marks through renderHTML specs", () => {
    const document = fromJSON(
      schema,
      docOf(
        h(2, "Title"),
        p("a ", { type: "text", text: "b", marks: [{ type: "bold" }] }),
      ),
    );
    expect(generateHTML(schema, document)).toBe(
      "<h2>Title</h2><p>a <strong>b</strong></p>",
    );
  });

  it("renders leaf nodes without a closing tag", () => {
    const document = fromJSON(
      schema,
      docOf(p("a", { type: "hardBreak" }, "b"), { type: "horizontalRule" }),
    );
    expect(generateHTML(schema, document)).toBe("<p>a<br>b</p><hr>");
  });

  it("renders nested content holes", () => {
    const document = fromJSON(
      schema,
      docOf({ type: "codeBlock", content: [{ type: "text", text: "x = 1" }] }),
    );
    expect(generateHTML(schema, document)).toBe(
      "<pre><code>x = 1</code></pre>",
    );
  });

  it("escapes text and attribute values", () => {
    const document = fromJSON(
      schema,
      docOf(
        p({
          type: "text",
          text: "<script>",
          marks: [{ type: "link", attrs: { href: '"x' } }],
        }),
      ),
    );
    expect(generateHTML(schema, document)).toBe(
      '<p><a href="&quot;x" target="_blank">&lt;script&gt;</a></p>',
    );
  });

  it("renders literal string children in a spec", () => {
    const spacer = Node.create({
      name: "spacer",
      group: "block",
      renderHTML: ({ HTMLAttributes }) => [
        "div",
        HTMLAttributes,
        "Page break",
        ["span", {}, "!"],
      ],
    });
    const instance = createTestEditor(docOf({ type: "spacer" }), [spacer]);
    expect(instance.getHTML()).toBe("<div>Page break<span>!</span></div>");
  });

  it("escapes literal string children", () => {
    const spacer = Node.create({
      name: "spacer",
      group: "block",
      renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, "<b>x</b>"],
    });
    const instance = createTestEditor(docOf({ type: "spacer" }), [spacer]);
    expect(instance.getHTML()).toBe("<div>&lt;b&gt;x&lt;/b&gt;</div>");
  });

  it("nests marks in registry order", () => {
    const document = fromJSON(
      schema,
      docOf(
        p({
          type: "text",
          text: "x",
          marks: [{ type: "italic" }, { type: "bold" }],
        }),
      ),
    );
    expect(generateHTML(schema, document)).toBe(
      "<p><strong><em>x</em></strong></p>",
    );
  });
});

describe("parseHTML", () => {
  it("parses tags into nodes and marks", () => {
    const document = parseHTML(schema, "<h2>Title</h2><p>a <b>b</b></p>");
    expect(toJSON(schema, document)).toEqual(
      docOf(
        h(2, "Title"),
        p("a ", { type: "text", text: "b", marks: [{ type: "bold" }] }),
      ),
    );
  });

  it("unwraps unknown elements", () => {
    const document = parseHTML(schema, "<div><p>kept</p></div>");
    expect(toJSON(schema, document)).toEqual(docOf(p("kept")));
  });

  it("collapses layout whitespace between blocks", () => {
    const document = parseHTML(schema, "<p>a</p>\n  <p>b</p>");
    expect(toJSON(schema, document)).toEqual(docOf(p("a"), p("b")));
  });

  it("preserves whitespace inside code blocks", () => {
    const document = parseHTML(schema, "<pre><code>a\n  b</code></pre>");
    expect(toJSON(schema, document).content?.[0].content?.[0].text).toBe(
      "a\n  b",
    );
  });

  it("matches parse rules written as CSS attribute selectors", () => {
    const callout = Node.create({
      name: "callout",
      group: "block",
      content: "block+",
      parseHTML: () => [{ tag: 'div[data-type="callout"]' }],
      renderHTML: ({ HTMLAttributes }) => [
        "div",
        { ...HTMLAttributes, "data-type": "callout" },
        0,
      ],
    });
    const instance = createTestEditor(null, [callout]);
    const document = parseHTML(
      instance.schema,
      '<div data-type="callout"><p>note</p></div><div><p>plain</p></div>',
    );
    expect(toJSON(instance.schema, document)).toEqual(
      docOf(block("callout", undefined, [p("note")]), p("plain")),
    );
  });

  it("round-trips HTML", () => {
    const html =
      "<h2>Title</h2><p>a <strong>b</strong></p><ul><li><p>one</p></li></ul>";
    expect(generateHTML(schema, parseHTML(schema, html))).toBe(html);
  });
});

describe("getText", () => {
  it("joins blocks with the separator", () => {
    const instance = createTestEditor(docOf(p("one"), p("two")));
    expect(instance.getText()).toBe("one\n\ntwo");
    expect(instance.getText({ blockSeparator: " | " })).toBe("one | two");
  });
});

describe("parseDOMContent", () => {
  function elementFor(html: string): Element {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return wrapper.firstElementChild as Element;
  }

  it("strips a trailing placeholder br instead of manufacturing a hardBreak", () => {
    const content = parseDOMContent(
      schema,
      elementFor("<p>hi<br></p>"),
      "paragraph",
    );
    expect(content).toEqual([{ type: "text", text: "hi" }]);
  });

  it("keeps a br that is not trailing", () => {
    const content = parseDOMContent(
      schema,
      elementFor("<p>hi<br>there</p>"),
      "paragraph",
    );
    expect(content).toEqual([
      { type: "text", text: "hi" },
      { type: "hardBreak", attrs: {} },
      { type: "text", text: "there" },
    ]);
  });

  it("keeps a trailing br when stripping is disabled (real trailing hardBreak)", () => {
    const content = parseDOMContent(
      schema,
      elementFor("<p>hi<br></p>"),
      "paragraph",
      undefined,
      false,
    );
    expect(content).toEqual([
      { type: "text", text: "hi" },
      { type: "hardBreak", attrs: {} },
    ]);
  });

  it("parseHTML (paste path) keeps a trailing br as a hardBreak", () => {
    const parsed = parseHTML(schema, "<p>hi<br></p>");
    expect(parsed.content?.[0].content).toEqual([
      { type: "text", text: "hi" },
      { type: "hardBreak", attrs: {} },
    ]);
  });
});
