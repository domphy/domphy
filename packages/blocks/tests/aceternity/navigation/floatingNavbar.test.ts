// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { floatingNavbar } from "../../../src/aceternity/navigation/floatingNavbar.ts";

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

describe("floatingNavbar", () => {
  it("renders a working demo with zero arguments: 4 nav links + a Login CTA", () => {
    const { host } = render(floatingNavbar());

    const header = host.querySelector("header")!;
    expect(header).toBeTruthy();
    expect(header.getAttribute("data-tone")).toBe("shift-14");
    expect(header.querySelectorAll("nav a").length).toBe(4);
    expect(header.textContent).toContain("Login");
  });

  it("respects custom items and CTA label/href", () => {
    const { host } = render(
      floatingNavbar({
        items: [{ label: "Docs", href: "#docs" }],
        ctaLabel: "Sign up",
        ctaHref: "#signup",
      }),
    );

    const links = host.querySelectorAll("nav a");
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain("Docs");
    const cta = Array.from(host.querySelectorAll("a")).find((a) => a.textContent === "Sign up");
    expect(cta?.getAttribute("href")).toBe("#signup");
  });

  it("does not throw when scroll events fire (direction-based hide/reveal wiring)", () => {
    const { host } = render(floatingNavbar());
    expect(host.querySelector("header")).toBeTruthy();

    expect(() => {
      Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
      window.dispatchEvent(new Event("scroll"));
      Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
      window.dispatchEvent(new Event("scroll"));
    }).not.toThrow();
  });
});
