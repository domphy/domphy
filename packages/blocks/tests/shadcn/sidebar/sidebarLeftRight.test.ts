// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebarLeftRight } from "../../../src/shadcn/sidebar/sidebarLeftRight.ts";

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

describe("sidebarLeftRight", () => {
  it("renders a working demo tree with zero args: two asides + main", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    const asides = host.querySelectorAll("aside");
    expect(asides.length).toBe(2);
    expect(host.querySelector("main")).toBeTruthy();
  });

  it("renders the org switcher, favorites, and workspace groups on the left sidebar", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc");
    expect(host.textContent).toContain("Getting Started");
    expect(host.textContent).toContain("Product");
    expect(host.textContent).toContain("Roadmap");
  });

  it("renders quick-access links and footer utility links on the left sidebar", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    expect(host.textContent).toContain("Search");
    expect(host.textContent).toContain("Ask AI");
    expect(host.textContent).toContain("Home");
    expect(host.textContent).toContain("Inbox");
    expect(host.textContent).toContain("Settings");
    expect(host.textContent).toContain("Trash");
  });

  it("renders the current user, inline calendar and grouped calendar lists on the right sidebar", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    expect(host.textContent).toContain("Shad Cn");
    expect(host.textContent).toContain("shadcn@example.com");
    expect(host.textContent).toContain("My Calendars");
    expect(host.textContent).toContain("Personal");
    expect(host.textContent).toContain("New Calendar");
  });

  it("clicking a favorite's more button opens its action menu without throwing", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    const moreButtons = Array.from(host.querySelectorAll('button[aria-label*="actions"]'));
    expect(moreButtons.length).toBeGreaterThan(0);
    expect(() => (moreButtons[0] as HTMLButtonElement).click()).not.toThrow();
  });

  it("toggling a calendar checkbox updates its checked state", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    const initial = checkbox.checked;
    checkbox.click();
    flushSync();
    expect(checkbox.checked).toBe(!initial);
  });

  it("clicking a date in the inline calendar selects it without throwing", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    const dayButtons = Array.from(host.querySelectorAll('aside button[aria-selected]'));
    expect(dayButtons.length).toBeGreaterThan(0);
    expect(() => (dayButtons[10] as HTMLButtonElement).click()).not.toThrow();
  });

  it("clicking the header toggle collapses the left sidebar without throwing", () => {
    const { host } = render(sidebarLeftRight() as DomphyElement);
    const toggle = host.querySelector("main header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts custom breadcrumb and user data", () => {
    const { host } = render(
      sidebarLeftRight({
        breadcrumbLabel: "Projects",
        user: { name: "Ada Lovelace", email: "ada@example.com" },
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Projects");
    expect(host.textContent).toContain("Ada Lovelace");
    expect(host.textContent).toContain("ada@example.com");
  });
});
