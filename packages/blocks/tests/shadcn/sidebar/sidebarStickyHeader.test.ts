// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebarStickyHeader } from "../../../src/shadcn/sidebar/sidebarStickyHeader.ts";

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

describe("sidebarStickyHeader", () => {
  it("renders a working demo tree with zero args: header + aside + main", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    expect(host.querySelectorAll("header").length).toBe(1);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
  });

  it("renders the site header as a sibling of the sidebar/main row, not nested inside main", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    const header = host.querySelector("header")!;
    const main = host.querySelector("main")!;
    expect(main.contains(header)).toBe(false);
    expect(header.contains(main)).toBe(false);
  });

  it("renders a search field in the site header", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    const header = host.querySelector("header")!;
    const searchInput = header.querySelector('input[type="search"]');
    expect(searchInput).toBeTruthy();
  });

  it("renders the brand header, Platform nav groups, projects and secondary nav", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc");
    expect(host.textContent).toContain("Playground");
    expect(host.textContent).toContain("Design Engineering");
    expect(host.textContent).toContain("Support");
    expect(host.textContent).toContain("Feedback");
    expect(host.textContent).toContain("More");
  });

  it("renders the user footer with name and email", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    expect(host.textContent).toContain("shadcn");
    expect(host.textContent).toContain("m@example.com");
  });

  it("clicking the header toggle does not throw", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("marks the pre-expanded active child link with aria-current=page", () => {
    const { host } = render(sidebarStickyHeader() as DomphyElement);
    const activeLinks = Array.from(host.querySelectorAll('a[aria-current="page"]'));
    expect(activeLinks.some((link) => link.textContent?.includes("Starred"))).toBe(true);
  });

  it("accepts custom breadcrumb and secondary nav data", () => {
    const { host } = render(
      sidebarStickyHeader({
        breadcrumbItems: [{ label: "Docs" }, { label: "Overview" }],
        secondaryNav: [{ title: "Help Center", href: "#" }],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Overview");
    expect(host.textContent).toContain("Help Center");
    expect(host.textContent).not.toContain("Feedback");
  });
});
