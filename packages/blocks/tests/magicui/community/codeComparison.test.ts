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
  it("renders two panels with zero args, each with a filename header and a code block", () => {
    const { host } = render(codeComparison() as DomphyElement);
    const panels = host.querySelectorAll("pre");
    expect(panels.length).toBe(2);
    expect(host.textContent).toContain("before.ts");
    expect(host.textContent).toContain("after.ts");
  });

  it("strips [!code ...] markers from the rendered text", () => {
    const { host } = render(codeComparison() as DomphyElement);
    expect(host.textContent).not.toContain("[!code");
  });

  it("renders custom left/right code and filenames with one line-span per source line", () => {
    const { host } = render(
      codeComparison({
        leftCode: "const a = 1;\nconst b = 2;",
        rightCode: "let a = 1;",
        leftFilename: "old.js",
        rightFilename: "new.js",
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("old.js");
    expect(host.textContent).toContain("new.js");
    const [leftPre] = Array.from(host.querySelectorAll("pre"));
    const lineSpans = leftPre.querySelectorAll("code > span");
    expect(lineSpans.length).toBe(2);
  });
});
