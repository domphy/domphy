import { describe, expect, it } from "vitest";

import {
  blockRange,
  contentSize,
  endPosition,
  nodeAt,
  nodeSize,
  nodesBetween,
  resolve,
  startPosition,
  textBetween,
} from "../src/model/position.js";
import { createTestEditor, docOf, p } from "./fixtures.js";

const editor = createTestEditor(docOf(p("ab"), p("c")));
const schema = editor.schema;
const doc = editor.state.doc;

describe("token positions", () => {
  it("sizes nodes the ProseMirror way", () => {
    // <p>ab</p> = open + 2 chars + close
    expect(nodeSize(schema, doc.content![0])).toBe(4);
    expect(nodeSize(schema, doc.content![1])).toBe(3);
    expect(contentSize(schema, doc)).toBe(7);
  });

  it("resolves the documented positions of <p>ab</p><p>c</p>", () => {
    expect(resolve(schema, doc, 0).parent.type).toBe("doc");
    expect(resolve(schema, doc, 0).depth).toBe(0);

    const inFirst = resolve(schema, doc, 1);
    expect(inFirst.parent.type).toBe("paragraph");
    expect(inFirst.parentOffset).toBe(0);
    expect(inFirst.path).toEqual([0]);
    expect(inFirst.start()).toBe(1);
    expect(inFirst.end()).toBe(3);

    expect(resolve(schema, doc, 3).parentOffset).toBe(2);
    expect(resolve(schema, doc, 4).parent.type).toBe("doc");
    expect(resolve(schema, doc, 4).index).toBe(1);

    const inSecond = resolve(schema, doc, 5);
    expect(inSecond.parent.type).toBe("paragraph");
    expect(inSecond.path).toEqual([1]);
    expect(inSecond.start()).toBe(5);
  });

  it("resolves inside nested structures", () => {
    const nested = createTestEditor({
      type: "doc",
      content: [{ type: "blockquote", content: [p("hi")] }],
    });
    // doc(0) > blockquote(1) > paragraph(2) > "hi" at 3,4
    const $pos = resolve(nested.schema, nested.state.doc, 3);
    expect($pos.depth).toBe(2);
    expect($pos.node(0).type).toBe("doc");
    expect($pos.node(1).type).toBe("blockquote");
    expect($pos.parent.type).toBe("paragraph");
    expect($pos.path).toEqual([0, 0]);
  });

  it("walks nodes between two positions", () => {
    const visited: [string, number][] = [];
    nodesBetween(schema, doc, 0, contentSize(schema, doc), (node, pos) => {
      visited.push([node.type ?? "", pos]);
      return undefined;
    });
    expect(visited).toEqual([
      ["paragraph", 0],
      ["text", 1],
      ["paragraph", 4],
      ["text", 5],
    ]);
  });

  it("extracts text between positions", () => {
    expect(textBetween(schema, doc, 0, contentSize(schema, doc), "\n\n")).toBe(
      "ab\n\nc",
    );
    expect(textBetween(schema, doc, 2, 3)).toBe("b");
  });

  it("finds the node starting at a position", () => {
    expect(nodeAt(schema, doc, 0)?.type).toBe("paragraph");
    expect(nodeAt(schema, doc, 4)?.type).toBe("paragraph");
  });

  it("reports the first and last text positions", () => {
    expect(startPosition(schema, doc)).toBe(1);
    expect(endPosition(schema, doc)).toBe(6);
  });

  it("computes the block range covering a selection", () => {
    const range = blockRange(schema, doc, 1, 5);
    expect(range).toMatchObject({ depth: 0, startIndex: 0, endIndex: 2 });

    const cursor = blockRange(schema, doc, 2, 2);
    expect(cursor).toMatchObject({ depth: 0, startIndex: 0, endIndex: 1 });
  });
});
