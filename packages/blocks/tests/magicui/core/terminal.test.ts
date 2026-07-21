// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { terminal } from "../../../src/magicui/core/terminal.js";

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

describe("terminal", () => {
  it("renders a working demo with zero arguments (header dots + scripted lines)", () => {
    const { host } = render(terminal());

    const window_ = host.firstElementChild!;
    expect(window_).toBeTruthy();
    // Header: exactly the three traffic-light dot spans — upstream's window
    // chrome has no title bar text, so there is no <small> element either.
    const header = window_.children[0];
    expect(header.children.length).toBe(3);
    expect(window_.querySelectorAll("small")).toHaveLength(0);
    // Typing + fade lines rest at full text so freeze/catalog shots are complete.
    expect(host.textContent).toContain("Scaffolding your project");
    expect(host.textContent).toContain("npx domphy@latest init");
    // Five scripted lines from the default script.
    expect(window_.children.length).toBe(2); // header row + lines column
    const linesColumn = window_.children[1];
    expect(linesColumn.children.length).toBe(5);
  });

  it("renders custom lines with full typing + fade text immediately at rest", () => {
    const { host } = render(
      terminal({
        startOnView: false,
        lines: [
          { type: "typing", text: "echo hi" },
          { type: "fade", text: "Done", color: "success" },
        ],
      }),
    );
    expect(host.textContent).toContain("▊");
    expect(host.textContent).toContain("echo hi");
    expect(host.textContent).toContain("Done");
  });
});
