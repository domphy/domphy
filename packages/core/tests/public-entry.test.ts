// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as globalEntry from "../src/global.ts";
import { ElementNode, TextNode } from "../src/index.ts";

describe("public entry", () => {
  it("exports TextNode from the package root and uses it for string children", () => {
    const host = document.createElement("div");
    const node = new ElementNode({ p: "hello" });
    node.render(host);
    const child = node.children.items[0];
    expect(child).toBeInstanceOf(TextNode);
    expect(child.type).toBe("TextNode");
    expect((child as TextNode).text).toBe("hello");
  });

  it("CDN IIFE entry puts ElementNode on the Domphy namespace, not nested .core", () => {
    expect(globalEntry.ElementNode).toBe(ElementNode);
    expect(
      (globalEntry as { core?: { ElementNode?: unknown } }).core?.ElementNode,
    ).toBeUndefined();
  });
});
