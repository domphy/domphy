// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hoverSidebar } from "../../../src/aceternity/navigation/hoverSidebar.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom's <dialog> support is partial in this repo's jsdom version — stub
  // showModal/close so the mobile drawer's `_onMount` never throws (mirrors
  // packages/blocks/tests/shadcn/sidebar/*.test.ts's own convention).
  if (!(HTMLDialogElement.prototype as any).showModal) {
    (HTMLDialogElement.prototype as any).showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("hoverSidebar", () => {
  it("renders a working demo with zero arguments: desktop rail + mobile toggle + drawer", () => {
    const { host } = render(hoverSidebar());

    const aside = host.querySelector("aside")!;
    expect(aside).toBeTruthy();
    expect(aside.getAttribute("data-tone")).toBe("shift-16");
    expect(aside.querySelectorAll("a").length).toBe(5);

    expect(host.querySelectorAll('button[aria-label="Open navigation menu"]').length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
  });

  it("every nav link carries an accessible label regardless of collapse state", () => {
    const { host } = render(hoverSidebar());
    const aside = host.querySelector("aside")!;
    const links = Array.from(aside.querySelectorAll("a"));
    expect(links.every((link) => link.getAttribute("aria-label"))).toBe(true);
  });

  it("expands on mouseenter and collapses on mouseleave without throwing", () => {
    const { host } = render(hoverSidebar());
    const aside = host.querySelector("aside")!;

    expect(() => aside.dispatchEvent(new MouseEvent("mouseenter"))).not.toThrow();
    expect(() => aside.dispatchEvent(new MouseEvent("mouseleave"))).not.toThrow();
  });

  it("the mobile toggle opens the drawer dialog", () => {
    const { host } = render(hoverSidebar());
    const toggle = host.querySelector('button[aria-label="Open navigation menu"]') as HTMLButtonElement;
    const dialog = host.querySelector("dialog") as HTMLDialogElement;

    expect(dialog.open).toBe(false);
    toggle.click();
    flushSync();
    expect(dialog.open).toBe(true);
  });

  it("accepts custom links and a profile with an avatar image", () => {
    const { host } = render(
      hoverSidebar({
        links: [{ label: "Only Link", icon: "home", href: "#only" }],
        profile: { name: "Jamie Doe", avatarSrc: "https://example.com/avatar.png" },
      }),
    );

    const aside = host.querySelector("aside")!;
    expect(aside.querySelectorAll("a").length).toBe(1);
    expect(aside.textContent).toContain("Jamie Doe");
    expect(aside.querySelector("img")?.getAttribute("src")).toBe("https://example.com/avatar.png");
  });
});
