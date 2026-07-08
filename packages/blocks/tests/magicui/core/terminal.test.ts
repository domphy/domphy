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
    // Fade lines render their full text immediately (only their opacity
    // animates in), so the default script's output text is present right away.
    expect(host.textContent).toContain("Scaffolding your project");
    // Five scripted lines from the default script.
    expect(window_.children.length).toBe(2); // header row + lines column
    const linesColumn = window_.children[1];
    expect(linesColumn.children.length).toBe(5);
  });

  it("renders custom lines without throwing (typing line's cursor is present immediately; fade-line text is present immediately)", () => {
    const { host } = render(
      terminal({
        startOnView: false,
        lines: [
          { type: "typing", text: "echo hi" },
          { type: "fade", text: "Done", color: "success" },
        ],
      }),
    );
    // The blinking cursor renders immediately; the command text (including
    // any prompt glyph the author writes into it) types in over time (not
    // asserted here — see instructions on keeping tests short).
    expect(host.textContent).toContain("▊");
    // Fade lines render their full text as a static block right away.
    expect(host.textContent).toContain("Done");
  });
});
