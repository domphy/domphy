import { describe, expect, it } from "vitest";
import {
  type StarterKitOptions,
  starterKit,
} from "../../src/extensions/starterKit";
import { open } from "./harness";

const allNames = [
  "blockquote",
  "bold",
  "bulletList",
  "code",
  "codeBlock",
  "doc",
  "hardBreak",
  "heading",
  "horizontalRule",
  "italic",
  "link",
  "listItem",
  "orderedList",
  "paragraph",
  "strike",
  "text",
  "trailingNode",
  "underline",
  "undoRedo",
];

function namesOf(options: Partial<StarterKitOptions> = {}): string[] {
  const kit = open(starterKit(options));

  return (kit.config.addExtensions?.call(kit.context) ?? []).map(
    (extension) => extension.name,
  );
}

describe("starterKit", () => {
  it("is a factory returning a fresh configured extension", () => {
    const kit = starterKit();

    expect(kit.name).toBe("starterKit");
    expect(starterKit()).not.toBe(kit);
  });

  it("composes the whole default set", () => {
    expect(namesOf()).toEqual(allNames);
  });

  it("drops any extension set to false", () => {
    const names = namesOf({ heading: false, codeBlock: false, link: false });

    expect(names).not.toContain("heading");
    expect(names).not.toContain("codeBlock");
    expect(names).not.toContain("link");
    expect(names).toHaveLength(allNames.length - 3);
  });

  it("keeps the schema extensions unless explicitly disabled", () => {
    expect(namesOf({ document: false })).not.toContain("doc");
    expect(namesOf({ text: false })).not.toContain("text");
  });

  it("includes underline, as tiptap's v3 kit does", () => {
    expect(namesOf()).toContain("underline");
    expect(namesOf({ underline: false })).not.toContain("underline");
  });

  it("leaves table out, as tiptap's kit does", () => {
    expect(namesOf()).not.toContain("table");
  });

  it("includes trailingNode and can drop it", () => {
    expect(namesOf()).toContain("trailingNode");
    expect(namesOf({ trailingNode: false })).not.toContain("trailingNode");
  });

  it("passes options through to the sub-extension", () => {
    const kit = open(starterKit({ heading: { levels: [1, 2] } }));
    const heading = (kit.config.addExtensions?.call(kit.context) ?? []).find(
      (extension) => extension.name === "heading",
    );

    expect(heading?.options.levels).toEqual([1, 2]);
  });
});
