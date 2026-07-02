// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar10 } from "../../../src/shadcn/sidebar/sidebar10.ts";

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

  it("renders one collapsible <details> workspace per default-visible workspace, one pre-expanded", () => {
    const { host } = render(sidebar10() as DomphyElement);
    const details = host.querySelectorAll("aside details");
    expect(details.length).toBe(5);
    const openOnes = Array.from(details).filter((element) => element.hasAttribute("open"));
    expect(openOnes.length).toBe(1);
  });

  it("clicking the Favorites 'More' row reveals the rest of the favorites", async () => {
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.textContent).not.toContain("Security");
    const moreButtons = Array.from(host.querySelectorAll("button")).filter((button) => button.textContent === "More");
    expect(moreButtons.length).toBeGreaterThan(0);
    (moreButtons[0] as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.textContent).toContain("Security");
  });

  it("renders the secondary links and user footer", () => {
    const { host } = render(sidebar10() as DomphyElement);
    expect(host.textContent).toContain("Settings");
    expect(host.textContent).toContain("Trash");
    expect(host.textContent).toContain("Shad Cn");
  });

  it("clicking the header toggle and the three-dot actions button does not throw", () => {
    const { host } = render(sidebar10() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
    const moreActions = host.querySelector('header button[aria-label="More actions"]') as HTMLButtonElement;
    expect(moreActions).toBeTruthy();
    expect(() => moreActions.click()).not.toThrow();
  });

  it("accepts custom teams and workspaces data", () => {
    const { host } = render(
      sidebar10({
        teams: [{ name: "Custom Team", plan: "Free" }],
        workspaces: [{ name: "Solo Workspace", emoji: "🧑", pages: [{ title: "Notes" }] }],
        workspacesVisibleCount: 1,
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom Team");
    expect(host.textContent).toContain("Solo Workspace");
  });
});
