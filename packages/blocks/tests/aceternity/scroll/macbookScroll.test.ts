// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { macbookScroll } from "../../../src/aceternity/scroll/macbookScroll.ts";

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

describe("macbookScroll", () => {
  it("renders a working demo with zero args: heading, screen image, keyboard rows, trackpad, sticker", () => {
    const { host } = render(macbookScroll() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-tone")).toBe("shift-16");

    expect(wrapper.querySelector("h2")).toBeTruthy();
    expect(wrapper.querySelector("img")).toBeTruthy();
    // 6 keyboard rows.
    const keyboardRows = wrapper.querySelectorAll("[aria-hidden] > div");
    expect(keyboardRows.length).toBeGreaterThan(0);
    expect(wrapper.textContent).toContain("D");
  });

  it("omits the title/badge when explicitly set to null, and accepts a custom image", () => {
    const { host } = render(
      macbookScroll({
        title: null,
        badge: null,
        image: "https://picsum.photos/seed/custom/1200/750",
      }) as DomphyElement,
    );
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.querySelector("h2")).toBeFalsy();
    const image = wrapper.querySelector("img") as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("https://picsum.photos/seed/custom/1200/750");
  });

  it("does not throw on scroll/resize and cleans up listeners on removal", () => {
    const { node } = render(macbookScroll() as DomphyElement);
    expect(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    }).not.toThrow();
    expect(() => node.remove()).not.toThrow();
  });
});
