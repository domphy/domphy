// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stickyBanner } from "../../../src/aceternity/navigation/stickyBanner.ts";

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

describe("stickyBanner", () => {
  it("renders a working demo with zero arguments: message + CTA link", () => {
    const { host } = render(stickyBanner());

    const banner = host.firstElementChild as HTMLElement;
    expect(banner.getAttribute("role")).toBe("note");
    expect(banner.getAttribute("data-tone")).toBe("shift-15");
    expect(banner.querySelector("p")?.textContent).toBeTruthy();
    const cta = banner.querySelector("a")!;
    expect(cta.textContent).toBe("Read announcement");
  });

  it("respects a custom message and CTA props", () => {
    const onCtaClick = vi.fn();
    const { host } = render(
      stickyBanner({ message: "Custom message", ctaLabel: "Learn more", ctaHref: "#more", onCtaClick }),
    );

    expect(host.querySelector("p")?.textContent).toBe("Custom message");
    const cta = host.querySelector("a")!;
    expect(cta.textContent).toBe("Learn more");
    expect(cta.getAttribute("href")).toBe("#more");
    cta.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it("without hideOnScroll, scrolling does not throw and the banner stays put", () => {
    const { host } = render(stickyBanner());
    expect(() => {
      Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
    expect(host.firstElementChild).toBeTruthy();
  });

  it("with hideOnScroll, scrolling past the threshold does not throw", () => {
    const { host } = render(stickyBanner({ hideOnScroll: true }));
    expect(() => {
      Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
    expect(host.firstElementChild).toBeTruthy();
  });
});
