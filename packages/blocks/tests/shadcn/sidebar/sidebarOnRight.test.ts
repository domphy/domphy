// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebarOnRight } from "../../../src/shadcn/sidebar/sidebarOnRight.js";

// Same rationale as sidebar03.test.ts — the full aside + mobile-drawer + main
// tree renders nav content twice, which is legitimately slow under jsdom.
vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
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

describe("sidebarOnRight", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(sidebarOnRight());

    expect(host.querySelectorAll("aside").length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
    expect(host.querySelectorAll("main").length).toBe(1);
  });

  it("renders the main content column before the sidebar in DOM order (mirrored to the right)", () => {
    const { host } = render(sidebarOnRight());
    const root = host.firstElementChild!;
    const mainIndex = Array.from(root.children).findIndex((child) => child.tagName === "MAIN");
    const asideIndex = Array.from(root.children).findIndex((child) => child.tagName === "ASIDE");

    expect(mainIndex).toBeGreaterThanOrEqual(0);
    expect(asideIndex).toBeGreaterThan(mainIndex);
  });

  it("places the sidebar toggle button after the breadcrumb in the header (right edge)", () => {
    const { host } = render(sidebarOnRight());
    const header = host.querySelector("header")!;
    const nav = header.querySelector("nav")!;
    const toggle = header.querySelector("button")!;

    // header markup order should be [breadcrumb nav, spacer, divider, toggle]
    const headerButtonIndex = Array.from(header.children).indexOf(toggle);
    const headerNavIndex = Array.from(header.children).indexOf(nav);
    expect(headerNavIndex).toBeLessThan(headerButtonIndex);
  });

  it("renders parent nav items with a nested, indented sub-list of children", () => {
    const { host } = render(sidebarOnRight());
    const aside = host.querySelector("aside")!;
    const parentDetails = aside.querySelectorAll("nav li > details");

    expect(parentDetails.length).toBe(3);
    parentDetails.forEach((details) => {
      const subLinks = details.querySelectorAll("ul li a");
      expect(subLinks.length).toBeGreaterThan(0);
    });
  });

  it("marks active top-level and nested child links with aria-current=page", () => {
    const { host } = render(sidebarOnRight());
    const activeLinks = Array.from(host.querySelectorAll('a[aria-current="page"]'));
    const activeLabels = activeLinks.map((link) => link.textContent);

    expect(activeLabels.some((label) => label?.includes("Dashboard"))).toBe(true);
    expect(activeLabels.some((label) => label?.includes("Explorer"))).toBe(true);
  });

  it("accepts side: 'left' to fall back to the standard left-docked layout", () => {
    const { host } = render(sidebarOnRight({ side: "left" }));
    const root = host.firstElementChild!;
    const mainIndex = Array.from(root.children).findIndex((child) => child.tagName === "MAIN");
    const asideIndex = Array.from(root.children).findIndex((child) => child.tagName === "ASIDE");

    expect(asideIndex).toBeLessThan(mainIndex);
  });
});
