// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar06 } from "../../../src/shadcn/sidebar/sidebar06.ts";

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

describe("sidebar06", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar06() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders one dropdown-trigger button per top-level nav item, none open by default", () => {
    const { host } = render(sidebar06() as DomphyElement);
    const triggers = host.querySelectorAll('aside nav button[aria-haspopup="dialog"]');
    expect(triggers.length).toBe(4);
    triggers.forEach((trigger) => {
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("clicking a nav row's trigger flips aria-expanded to true", async () => {
    const { host } = render(sidebar06() as DomphyElement);
    const trigger = host.querySelector('aside nav button[aria-haspopup="dialog"]') as HTMLButtonElement;
    trigger.click();
    await new Promise((r) => setTimeout(r, 150));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders the opt-in card and footer by default", () => {
    const { host } = render(sidebar06() as DomphyElement);
    expect(host.textContent).toContain("Subscribe");
    // Upstream's <SidebarFooter> renders as `<div data-slot="sidebar-footer">`,
    // not a semantic <footer> element.
    expect(host.querySelector("aside [data-slot='sidebar-footer']")).toBeTruthy();
  });

  it("renders the opt-in card as a form with an email input above the button", () => {
    const { host } = render(sidebar06() as DomphyElement);
    // Upstream sidebar-06's SidebarOptInForm wraps a `type=email` SidebarInput
    // and the Subscribe button in a <form>.
    const emailInput = host.querySelector("aside form input[type='email']");
    expect(emailInput).toBeTruthy();
    expect(host.querySelector("aside form button[type='submit']")).toBeTruthy();
  });

  it("omits the opt-in card when optInCard is null", () => {
    const { host } = render(sidebar06({ optInCard: null }) as DomphyElement);
    expect(host.textContent).not.toContain("Get the latest updates");
  });

  it("accepts custom nav data and breadcrumb items", () => {
    const { host } = render(
      sidebar06({
        navItems: [{ title: "Custom", items: [{ title: "Child" }] }],
        breadcrumbItems: [{ label: "Home", href: "/" }, { label: "Custom" }],
      }) as DomphyElement,
    );
    expect(host.querySelectorAll('aside nav button[aria-haspopup="dialog"]').length).toBe(1);
    expect(host.textContent).toContain("Custom");
  });
});
