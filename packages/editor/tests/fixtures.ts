/**
 * Minimal inline schema used by the engine tests. Deliberately independent of
 * `src/extensions` so these tests exercise the engine, not the StarterKit.
 */

import { Editor } from "../src/Editor.js";
import { Mark, Node } from "../src/Extendable.js";
import type { AnyExtension, Attributes, JSONContent } from "../src/types.js";

export const doc = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",
});

export const text = Node.create({ name: "text", group: "inline" });

export const paragraph = Node.create({
  name: "paragraph",
  priority: 1000,
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "p" }],
  renderHTML: ({ HTMLAttributes }) => ["p", HTMLAttributes, 0],
});

export const heading = Node.create({
  name: "heading",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes: () => ({ level: { default: 1, rendered: false } }),
  parseHTML: () =>
    [1, 2, 3, 4, 5, 6].map((level) => ({ tag: `h${level}`, attrs: { level } })),
  renderHTML: ({ node, HTMLAttributes }) => [
    `h${node.attrs?.level ?? 1}`,
    HTMLAttributes,
    0,
  ],
});

export const blockquote = Node.create({
  name: "blockquote",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: "blockquote" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", HTMLAttributes, 0],
});

export const bulletList = Node.create({
  name: "bulletList",
  group: "block list",
  content: "listItem+",
  parseHTML: () => [{ tag: "ul" }],
  renderHTML: ({ HTMLAttributes }) => ["ul", HTMLAttributes, 0],
});

export const orderedList = Node.create({
  name: "orderedList",
  group: "block list",
  content: "listItem+",
  addAttributes: () => ({
    start: {
      default: 1,
      renderHTML: (attrs) =>
        attrs.start === 1 ? null : { start: attrs.start },
    },
  }),
  parseHTML: () => [{ tag: "ol" }],
  renderHTML: ({ HTMLAttributes }) => ["ol", HTMLAttributes, 0],
});

export const listItem = Node.create({
  name: "listItem",
  content: "paragraph block*",
  defining: true,
  parseHTML: () => [{ tag: "li" }],
  renderHTML: ({ HTMLAttributes }) => ["li", HTMLAttributes, 0],
});

export const codeBlock = Node.create({
  name: "codeBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  parseHTML: () => [{ tag: "pre" }],
  renderHTML: ({ HTMLAttributes }) => ["pre", HTMLAttributes, ["code", {}, 0]],
});

export const hardBreak = Node.create({
  name: "hardBreak",
  inline: true,
  group: "inline",
  selectable: false,
  parseHTML: () => [{ tag: "br" }],
  renderHTML: ({ HTMLAttributes }) => ["br", HTMLAttributes],
});

export const horizontalRule = Node.create({
  name: "horizontalRule",
  group: "block",
  parseHTML: () => [{ tag: "hr" }],
  renderHTML: ({ HTMLAttributes }) => ["hr", HTMLAttributes],
});

export const bold = Mark.create({
  name: "bold",
  parseHTML: () => [{ tag: "strong" }, { tag: "b" }],
  renderHTML: ({ HTMLAttributes }) => ["strong", HTMLAttributes, 0],
});

export const italic = Mark.create({
  name: "italic",
  parseHTML: () => [{ tag: "em" }, { tag: "i" }],
  renderHTML: ({ HTMLAttributes }) => ["em", HTMLAttributes, 0],
});

export const code = Mark.create({
  name: "code",
  excludes: "_",
  code: true,
  parseHTML: () => [{ tag: "code" }],
  renderHTML: ({ HTMLAttributes }) => ["code", HTMLAttributes, 0],
});

export const link = Mark.create({
  name: "link",
  priority: 1000,
  addAttributes: () => ({
    href: { default: null },
    target: { default: "_blank" },
  }),
  parseHTML: () => [{ tag: "a[href]" }],
  renderHTML: ({ HTMLAttributes }) => ["a", HTMLAttributes, 0],
});

export const testExtensions: AnyExtension[] = [
  doc,
  text,
  paragraph,
  heading,
  blockquote,
  bulletList,
  orderedList,
  listItem,
  codeBlock,
  hardBreak,
  horizontalRule,
  bold,
  italic,
  code,
  link,
];

export function createTestEditor(
  content: JSONContent | JSONContent[] | string | null = null,
  extra: AnyExtension[] = [],
): Editor {
  return new Editor({ extensions: [...testExtensions, ...extra], content });
}

/** Shorthand builders for expected JSON. */
export function p(...content: (string | JSONContent)[]): JSONContent {
  return block("paragraph", undefined, content);
}

export function h(
  level: number,
  ...content: (string | JSONContent)[]
): JSONContent {
  return block("heading", { level }, content);
}

export function block(
  type: string,
  attrs: Attributes | undefined,
  content: (string | JSONContent)[],
): JSONContent {
  const children = content.map((item) =>
    typeof item === "string" ? { type: "text", text: item } : item,
  );
  const node: JSONContent = { type };
  if (attrs) {
    node.attrs = attrs;
  }
  if (children.length > 0) {
    node.content = children;
  }
  return node;
}

export function docOf(...content: JSONContent[]): JSONContent {
  return { type: "doc", content };
}
