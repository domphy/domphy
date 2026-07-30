// Fence-aware source transforms: apply a text transform only to the parts of
// a markdown document that live OUTSIDE code blocks. Raw string replacements
// (script stripping, `<<<` code imports, include markers, …) must never touch
// fenced/indented code — their patterns legitimately appear there as EXAMPLES,
// and rewriting them silently corrupts the very documentation being shown.

import type { Code, Nodes } from "mdast";
import { remark } from "remark";

function collectCodeRanges(node: Nodes, ranges: Array<[number, number]>): void {
  if (node.type === "code") {
    const position = (node as Code).position;
    if (
      position &&
      typeof position.start.offset === "number" &&
      typeof position.end.offset === "number"
    ) {
      ranges.push([position.start.offset, position.end.offset]);
    }
    return; // code nodes have no children
  }
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children as Nodes[])
      collectCodeRanges(child, ranges);
  }
}

/**
 * Applies `transform` to every segment of `source` that is NOT inside a code
 * block, leaving code block content byte-for-byte intact.
 *
 * The source is parsed with remark, so CommonMark fence rules are honored:
 * a fence only closes on the same marker (` ``` ` vs `~~~`) at equal or
 * greater length (nested fences of the other marker are content), indented
 * code blocks count too, and fences inside blockquotes/lists are recognized
 * wherever they appear.
 *
 * `transform` runs once per contiguous outside-code segment, in source order;
 * the results are spliced back between the untouched code blocks.
 */
export function transformOutsideCodeBlocks(
  source: string,
  transform: (text: string) => string,
): string {
  const tree = remark().parse(source);
  const ranges: Array<[number, number]> = [];
  collectCodeRanges(tree, ranges);
  if (ranges.length === 0) return transform(source);

  ranges.sort((a, b) => a[0] - b[0]);
  let output = "";
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) output += transform(source.slice(cursor, start));
    output += source.slice(start, end);
    cursor = end;
  }
  if (cursor < source.length) output += transform(source.slice(cursor));
  return output;
}
