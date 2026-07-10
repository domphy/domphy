// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { backlight } from "../../../src/magicui/community/backlight.js";

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

describe("backlight", () => {
  it("renders a working demo with zero arguments (hidden filter defs + filtered media wrapper)", () => {
    const { host, node } = render(backlight());

    const container = host.firstElementChild!;
    const filterElement = container.querySelector("filter")!;
    expect(filterElement).toBeTruthy();
    expect(
      filterElement.querySelectorAll(
        "feGaussianBlur, feColorMatrix, feComposite",
      ).length,
    ).toBe(3);

    const filterId = filterElement.getAttribute("id")!;
    expect(filterId).toBeTruthy();
    // The media wrapper's CSS references the same filter id via `filter: url(#id)`.
    expect(node.generateCSS()).toContain(`filter: url(#${filterId})`);
    expect(container.querySelector("img")).toBeTruthy();
  });

  it("wraps custom media content instead of the default placeholder", () => {
    const { host } = render(
      backlight({
        children: { video: null, src: "movie.mp4" } as DomphyElement,
      }),
    );

    const container = host.firstElementChild!;
    expect(container.querySelector("img")).toBeFalsy();
    expect(container.querySelector("video")).toBeTruthy();
  });
});
