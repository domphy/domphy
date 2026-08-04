/**
 * SSR smoke fixture: render Domphy trees to HTML strings in plain Node
 * (no DOM) and assert the output. Any missing dependency or broken
 * exports map in the tarballs surfaces here as an import/runtime error.
 */
import assert from "node:assert/strict";
import { ElementNode, toState } from "@domphy/core";
import { parseMarkdown } from "@domphy/markdown";

// A small declarative tree with reactive content, SSR-rendered via
// ElementNode.generateHTML() — the same path @domphy/app uses server-side.
const count = toState(41);
const node = new ElementNode({
  div: [{ h1: "SSR smoke" }, { p: () => `Count: ${count.get() + 1}` }],
});
const html = node.generateHTML();

assert.ok(html.includes("<h1"), "expected an <h1> in the SSR output");
assert.ok(html.includes("SSR smoke"), "expected the heading text");
assert.ok(html.includes("<p"), "expected a <p> in the SSR output");
assert.ok(html.includes("Count: 42"), "expected the reactive text");

// Markdown → Domphy tree → SSR HTML (exercises @domphy/markdown's deps:
// remark/unified must resolve from the tarball install).
const { body } = parseMarkdown("# Hello Markdown\n\nSome **bold** text.");
const markdownHtml = new ElementNode({ div: body }).generateHTML();

assert.ok(
  markdownHtml.includes("Hello Markdown"),
  "expected the markdown heading text",
);
assert.ok(
  markdownHtml.includes("<strong"),
  "expected bold text rendered as <strong>",
);

console.log("ssr-app: all assertions passed");
