// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { resizableNavbar } from "../../../src/aceternity/navigation/resizableNavbar.ts";

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

describe("resizableNavbar", () => {
  it("renders a working demo with zero arguments: desktop bar + mobile panel", () => {
    const { host } = render(resizableNavbar());

    const header = host.querySelector("header")!;
    expect(header).toBeTruthy();
    const desktopNav = header.querySelector("nav")!;
    expect(desktopNav.textContent).toContain("Acme");
    expect(desktopNav.querySelectorAll("a").length).toBe(4 + 2); // 4 links + 2 buttons

    // Mobile block: logo + toggle button, no <nav>.
    const mobileToggle = host.querySelector('button[aria-label="Toggle menu"]');
    expect(mobileToggle).toBeTruthy();
  });

  it("toggling the mobile menu flips aria-expanded", () => {
    const { host } = render(resizableNavbar());
    const toggle = host.querySelector('button[aria-label="Toggle menu"]') as HTMLButtonElement;

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    flushSync();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not throw when scroll events drive the width/pill interpolation", () => {
    const { host } = render(resizableNavbar());
    expect(host.querySelector("header")).toBeTruthy();

    expect(() => {
      Object.defineProperty(window, "scrollY", { value: 300, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
  });

  it("respects custom buttons with a gradient/dark variant and showMobile:false", () => {
    const { host } = render(
      resizableNavbar({
        buttons: [{ label: "Launch", href: "#launch", variant: "gradient" }],
        showMobile: false,
      }),
    );

    expect(host.textContent).toContain("Launch");
    expect(host.querySelector('button[aria-label="Toggle menu"]')).toBeNull();
  });
});
