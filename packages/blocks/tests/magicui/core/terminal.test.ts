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
    // Header: three traffic-light dot spans + centered title.
    expect(window_.querySelectorAll("small")).toHaveLength(1);
    expect(host.textContent).toContain("zsh");
    // Five scripted lines from the default script.
    expect(window_.children.length).toBe(2); // header row + lines column
    const linesColumn = window_.children[1];
    expect(linesColumn.children.length).toBe(5);
  });

  it("renders custom lines without throwing (fade-line text is present immediately; typed text reveals asynchronously)", () => {
    const { host } = render(
      terminal({
        startOnView: false,
        lines: [
          { type: "typing", text: "echo hi" },
          { type: "fade", text: "Done", color: "success" },
        ],
      }),
    );
    // The typed prompt marker renders immediately; the command body types in
    // over time (not asserted here — see instructions on keeping tests short).
    expect(host.textContent).toContain("$");
    // Fade lines render their full text as a static block right away.
    expect(host.textContent).toContain("Done");
  });
});
