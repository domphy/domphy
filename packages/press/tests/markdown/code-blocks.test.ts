import { describe, expect, it } from "vitest";
import { transformOutsideCodeBlocks } from "../../src/index";

const shout = (text: string) => text.replaceAll("hello", "SHOUTED");

describe("transformOutsideCodeBlocks", () => {
  it("transforms prose but leaves fenced code untouched", () => {
    const source = "hello prose\n\n```js\nhello code\n```\n\nhello again\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "SHOUTED prose\n\n```js\nhello code\n```\n\nSHOUTED again\n",
    );
  });

  it("applies the transform to the whole source when there are no code blocks", () => {
    expect(transformOutsideCodeBlocks("hello world", shout)).toBe(
      "SHOUTED world",
    );
  });

  it("treats a backtick fence inside a tilde fence as content (nested fences)", () => {
    const source = "~~~~\n```\nhello\n```\n~~~~\n\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "~~~~\n```\nhello\n```\n~~~~\n\nSHOUTED\n",
    );
  });

  it("treats a tilde fence inside a backtick fence as content", () => {
    const source = "```\n~~~~\nhello\n~~~~\n```\n\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "```\n~~~~\nhello\n~~~~\n```\n\nSHOUTED\n",
    );
  });

  it("does not close a fence on a shorter marker of the same kind", () => {
    const source = "````\nhello\n```\nhello\n````\n\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "````\nhello\n```\nhello\n````\n\nSHOUTED\n",
    );
  });

  it("leaves indented code blocks untouched", () => {
    const source = "hello para\n\n    hello indented\n\nhello after\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "SHOUTED para\n\n    hello indented\n\nSHOUTED after\n",
    );
  });

  it("recognizes fences nested in blockquotes", () => {
    const source = "> ```\n> hello\n> ```\n\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "> ```\n> hello\n> ```\n\nSHOUTED\n",
    );
  });

  it("treats the rest of the document as code after an unclosed fence", () => {
    const source = "hello\n\n```js\nhello\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "SHOUTED\n\n```js\nhello\nhello\n",
    );
  });

  it("handles multiple code blocks in one document", () => {
    const source =
      "hello\n\n```\nhello\n```\n\nhello\n\n~~~\nhello\n~~~\n\nhello\n";
    expect(transformOutsideCodeBlocks(source, shout)).toBe(
      "SHOUTED\n\n```\nhello\n```\n\nSHOUTED\n\n~~~\nhello\n~~~\n\nSHOUTED\n",
    );
  });
});
