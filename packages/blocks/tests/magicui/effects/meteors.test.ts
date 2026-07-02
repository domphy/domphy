// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { meteors } from "../../../src/magicui/effects/meteors.js";

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

describe("meteors", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(meteors());

    const container = host.firstElementChild!;
    expect(container.getAttribute("data-tone")).toBeTruthy();
    // Default count is 20 meteor spans, plus one content wrapper div.
    expect(container.querySelectorAll(":scope > span").length).toBe(20);
    expect(container.textContent).toContain("Meteor Shower");
  });

  it("respects a custom count and custom children", () => {
    const { host } = render(
      meteors({ count: 5, children: { p: "Behind the meteors" }, angle: 200 }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelectorAll(":scope > span").length).toBe(5);
    expect(container.textContent).toContain("Behind the meteors");
  });
});
