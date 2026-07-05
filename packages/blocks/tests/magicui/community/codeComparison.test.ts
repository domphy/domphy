// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { codeComparison } from "../../../src/magicui/community/codeComparison.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("codeComparison", () => {
  it("renders two panels with zero args, each with a code block, a shared filename, before/after labels, and a VS badge", () => {
    const { host } = render(codeComparison() as DomphyElement);
    const panels = host.querySelectorAll("pre");
    expect(panels.length).toBe(2);
    // Shared filename appears once per header (twice total), not two distinct names.
    const filenameMatches = (host.textContent ?? "").match(/app\.ts/g) ?? [];
    expect(filenameMatches.length).toBe(2);
    expect(host.textContent).toContain("before");
    expect(host.textContent).toContain("after");
    expect(host.textContent).toContain("VS");
    // One hand-authored file glyph per header.
    expect(host.querySelectorAll("svg").length).toBe(2);
  });

  it("strips [!code ...] markers from the rendered text", () => {
    const { host } = render(codeComparison() as DomphyElement);
    expect(host.textContent).not.toContain("[!code");
  });

  it("renders custom left/right code with a single shared filename and one line-span per source line", () => {
    const { host } = render(
      codeComparison({
        leftCode: "const a = 1;\nconst b = 2;",
        rightCode: "let a = 1;",
        filename: "middleware.ts",
      }) as DomphyElement,
    );
    const filenameMatches = (host.textContent ?? "").match(/middleware\.ts/g) ?? [];
    expect(filenameMatches.length).toBe(2);
    const [leftPre] = Array.from(host.querySelectorAll("pre"));
    const lineSpans = leftPre.querySelectorAll("code > span");
    expect(lineSpans.length).toBe(2);
  });
});
