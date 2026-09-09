// markdown-it-mark / markdown-it-sub / markdown-it-sup syntax (VitePress).
// Runs as a remark transformer AFTER remark-gfm so `~~strike~~` is already a
// delete node; leftover single `~…~` is subscript. `==…==` may wrap across
// phrasing siblings (`==**bold**==`). `^…^` is superscript. No whitespace
// inside sub/sup (markdown-it-sub/sup contract).

import type { Parent, Root, Text } from "mdast";
import type { Plugin } from "unified";

const MARK = "==";

interface InlineNode {
  type: string;
  value?: string;
  children?: InlineNode[];
}

function isText(node: InlineNode): node is Text & InlineNode {
  return node.type === "text" && typeof node.value === "string";
}

function isWs(ch: string | undefined): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function textNode(value: string): Text {
  return { type: "text", value };
}

function pushText(out: InlineNode[], value: string): void {
  if (!value) return;
  const last = out[out.length - 1];
  if (last && isText(last)) {
    last.value += value;
    return;
  }
  out.push(textNode(value));
}

function precedingChar(inner: InlineNode[]): string | undefined {
  for (let index = inner.length - 1; index >= 0; index--) {
    const node = inner[index];
    if (isText(node) && node.value.length > 0) {
      return node.value[node.value.length - 1];
    }
    if (!isText(node)) return "x";
  }
  return undefined;
}

/** First `==` not preceded by whitespace. `preceding` is the char before `value`. */
function findCloser(value: string, preceding: string | undefined): number {
  let pos = 0;
  while (pos <= value.length - MARK.length) {
    const at = value.indexOf(MARK, pos);
    if (at === -1) return -1;
    const prev = at === 0 ? preceding : value[at - 1];
    if (!isWs(prev)) return at;
    pos = at + 1;
  }
  return -1;
}

function wrapMarks(children: InlineNode[]): InlineNode[] {
  const rest = children.slice();
  const out: InlineNode[] = [];
  while (rest.length > 0) {
    const child = rest.shift() as InlineNode;
    if (!isText(child)) {
      out.push(child);
      continue;
    }
    if (child.value.length === 0) continue;

    const openAt = child.value.indexOf(MARK);
    if (openAt === -1) {
      out.push(child);
      continue;
    }

    const before = child.value.slice(0, openAt);
    const afterOpen = child.value.slice(openAt + MARK.length);
    if (afterOpen.length > 0 && isWs(afterOpen[0])) {
      pushText(out, before + MARK);
      rest.unshift(textNode(afterOpen));
      continue;
    }

    const closeSame = findCloser(afterOpen, undefined);
    if (closeSame !== -1) {
      pushText(out, before);
      const innerText = afterOpen.slice(0, closeSame);
      if (innerText.length > 0) {
        out.push({ type: "mark", children: [textNode(innerText)] });
      } else {
        pushText(out, MARK + MARK);
      }
      const remainder = afterOpen.slice(closeSame + MARK.length);
      if (remainder) rest.unshift(textNode(remainder));
      continue;
    }

    const inner: InlineNode[] = [];
    if (afterOpen) inner.push(textNode(afterOpen));
    let closerOff = -1;
    let consumed = 0;
    for (let index = 0; index < rest.length; index++) {
      const sibling = rest[index];
      if (!isText(sibling)) {
        inner.push(sibling);
        continue;
      }
      const offset = findCloser(sibling.value, precedingChar(inner));
      if (offset === -1) {
        inner.push(sibling);
        continue;
      }
      if (offset > 0) inner.push(textNode(sibling.value.slice(0, offset)));
      closerOff = offset;
      consumed = index + 1;
      const remainder = sibling.value.slice(offset + MARK.length);
      rest.splice(0, consumed);
      if (remainder) rest.unshift(textNode(remainder));
      break;
    }

    if (closerOff === -1) {
      pushText(out, before + MARK);
      if (afterOpen) rest.unshift(textNode(afterOpen));
      continue;
    }

    pushText(out, before);
    if (inner.length > 0) {
      out.push({ type: "mark", children: inner });
    } else {
      pushText(out, MARK + MARK);
    }
  }
  return out;
}

// markdown-it-sub / markdown-it-sup: single delimiter, no whitespace inside.
const SUB_SUP_RE = /~([^~\s]+)~|\^([^^\s]+)\^/g;

function splitSubSup(children: InlineNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  for (const child of children) {
    if (!isText(child)) {
      out.push(child);
      continue;
    }
    const value = child.value;
    SUB_SUP_RE.lastIndex = 0;
    let last = 0;
    let match = SUB_SUP_RE.exec(value);
    while (match !== null) {
      if (match.index > last) pushText(out, value.slice(last, match.index));
      if (match[1] !== undefined) {
        out.push({ type: "sub", children: [textNode(match[1])] });
      } else if (match[2] !== undefined) {
        out.push({ type: "sup", children: [textNode(match[2])] });
      }
      last = match.index + match[0].length;
      match = SUB_SUP_RE.exec(value);
    }
    if (last < value.length) pushText(out, value.slice(last));
  }
  return out;
}

function walk(node: InlineNode): void {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "code" || node.type === "inlineCode") return;
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (const child of children) walk(child);
  const next = wrapMarks(splitSubSup(children));
  (node as Parent).children = next as Parent["children"];
}

/** Remark plugin: `==mark==`, `~sub~`, `^sup^` (markdown-it / VitePress). */
export const remarkMarkSubSup: Plugin<[], Root> = () => {
  return (tree) => {
    walk(tree);
  };
};
