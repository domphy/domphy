import { describe, expect, it } from "vitest";
import { Editor } from "../../src/Editor";
import { Document } from "../../src/extensions/document";
import { Link } from "../../src/extensions/link";
import { Paragraph } from "../../src/extensions/paragraph";
import { Text } from "../../src/extensions/text";
import type { JSONContent } from "../../src/types";

const scriptHref = "javascript:alert(1)";

function linkedParagraph(href: string, text = "xss"): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text,
            marks: [{ type: "link", attrs: { href } }],
          },
        ],
      },
    ],
  };
}

function createEditor(content: JSONContent | string | null = null) {
  return new Editor({
    content,
    extensions: [Document, Paragraph, Text, Link],
  });
}

function hrefsOf(editor: Editor): string[] {
  const hrefs: string[] = [];
  const walk = (node: JSONContent) => {
    for (const mark of node.marks ?? []) {
      if (mark.type === "link" && typeof mark.attrs?.href === "string") {
        hrefs.push(mark.attrs.href);
      }
    }
    for (const child of node.content ?? []) {
      walk(child);
    }
  };
  walk(editor.getJSON());
  return hrefs;
}

describe("isAllowedUri on ingest and mark commands", () => {
  it("strips a javascript href loaded through fromJSON / setContent", () => {
    const editor = createEditor(linkedParagraph(scriptHref));

    expect(hrefsOf(editor)).toEqual([]);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/javascript/i);

    editor.commands.setContent(linkedParagraph(scriptHref, "again"));
    expect(hrefsOf(editor)).toEqual([]);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/javascript/i);
    editor.destroy();
  });

  it("keeps an allowed href loaded from JSON", () => {
    const editor = createEditor(linkedParagraph("https://domphy.dev"));

    expect(hrefsOf(editor)).toEqual(["https://domphy.dev"]);
    editor.destroy();
  });

  it("rejects setMark with a javascript href", () => {
    const editor = createEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "xss" }] }],
    });
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(editor.commands.setMark("link", { href: scriptHref })).toBe(false);
    expect(hrefsOf(editor)).toEqual([]);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/javascript/i);

    expect(editor.commands.setMark("link", { href: "https://ok.dev" })).toBe(
      true,
    );
    expect(hrefsOf(editor)).toEqual(["https://ok.dev"]);
    editor.destroy();
  });

  it("rejects updateAttributes that would write a javascript href", () => {
    const editor = createEditor(linkedParagraph("https://ok.dev"));
    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(
      editor.commands.updateAttributes("link", { href: scriptHref }),
    ).toBe(false);
    expect(hrefsOf(editor)).toEqual(["https://ok.dev"]);
    expect(JSON.stringify(editor.getJSON())).not.toMatch(/javascript/i);

    expect(
      editor.commands.updateAttributes("link", { href: "https://next.dev" }),
    ).toBe(true);
    expect(hrefsOf(editor)).toEqual(["https://next.dev"]);
    editor.destroy();
  });
});
