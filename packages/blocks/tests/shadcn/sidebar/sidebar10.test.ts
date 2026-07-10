// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sidebar10 } from "../../../src/shadcn/sidebar/sidebar10.ts";

// Full sidebar trees are legitimately slow under jsdom when many sibling
// test files share the worker pool — same raised timeout as sidebar01-04.
vi.setConfig({ testTimeout: 20000 });

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

describe("sidebar10", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders the team switcher, quick links, favorites and workspaces groups", () => {
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc");
    expect(host.textContent).toContain("Search");
    expect(host.textContent).toContain("Ask AI");
    expect(host.textContent).toContain("Roadmap");
    expect(host.textContent).toContain("Engineering");
  });

  it("renders one workspace chevron-toggle per default-visible workspace, all collapsed by default", () => {
    // Mirrors upstream nav-workspaces.tsx: each workspace is wrapped in a bare
    // <Collapsible> with no `defaultOpen` — every workspace starts collapsed.
    const { host } = render(sidebar10() as DomphyElement);
    const toggles = Array.from(
      host.querySelectorAll('aside button[data-slot="chevron-toggle"]'),
    );
    expect(toggles.length).toBe(5);
    const expandedOnes = toggles.filter(
      (toggle) => toggle.getAttribute("aria-expanded") === "true",
    );
    expect(expandedOnes.length).toBe(0);
  });

  it("clicking the Favorites 'More' row reveals the rest of the favorites", async () => {
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.textContent).not.toContain("Security");
    const moreButtons = Array.from(host.querySelectorAll("button")).filter(
      (button) => button.textContent === "More",
    );
    expect(moreButtons.length).toBeGreaterThan(0);
    (moreButtons[0] as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.textContent).toContain("Security");
  });

  it("renders the secondary links", () => {
    // Upstream app-sidebar.tsx renders no NavUser/footer for sidebar-10 (only
    // TeamSwitcher, NavMain, NavFavorites, NavWorkspaces, NavSecondary, SidebarRail).
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.textContent).toContain("Settings");
    expect(host.textContent).toContain("Trash");
  });

  it("clicking the header toggle and the three-dot actions button does not throw", async () => {
    const { host } = render(sidebar10() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
    const moreActions = host.querySelector(
      'header button[aria-label="More actions"]',
    ) as HTMLButtonElement;
    expect(moreActions).toBeTruthy();
    expect(() => moreActions.click()).not.toThrow();
    // Let the popover's open/close debounce timer settle before the test ends —
    // otherwise its pending timer fires mid-way through the next test and steals
    // its 100ms show() window (cross-test timing leak; afterEach only clears the
    // DOM, it doesn't run the framework's unmount/BeforeRemove cleanup).
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  it("opens the Notion-style page-actions menu with the upstream grouped items", async () => {
    const { host } = render(sidebar10() as DomphyElement);
    const moreActions = host.querySelector(
      'header button[aria-label="More actions"]',
    ) as HTMLButtonElement;
    moreActions.click();
    // Popover content mounts on a ~100ms open timer.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const menuText = document.body.textContent ?? "";
    expect(menuText).toContain("Customize Page");
    expect(menuText).toContain("Move to Trash");
    expect(menuText).toContain("Version History");
    expect(menuText).toContain("Export");
    // The old invented items are gone.
    expect(menuText).not.toContain("Invite members");
  });

  it("renders workspace sub-pages with a leading emoji", () => {
    const { host } = render(sidebar10() as DomphyElement);
    // Engineering is pre-expanded; its pages carry per-page emoji.
    expect(host.textContent).toContain("🏛️");
    expect(host.textContent).toContain("Architecture");
  });

  it("accepts custom teams and workspaces data", () => {
    const { host } = render(
      sidebar10({
        teams: [{ name: "Custom Team", plan: "Free" }],
        workspaces: [
          { name: "Solo Workspace", emoji: "🧑", pages: [{ title: "Notes" }] },
        ],
        workspacesVisibleCount: 1,
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom Team");
    expect(host.textContent).toContain("Solo Workspace");
  });
});
