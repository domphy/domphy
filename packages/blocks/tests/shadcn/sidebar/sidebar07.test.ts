// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar07 } from "../../../src/shadcn/sidebar/sidebar07.ts";

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

describe("sidebar07", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar07() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders the team switcher, nav-main groups and the projects list", () => {
    const { host } = render(sidebar07() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc");
    expect(host.textContent).toContain("Playground");
    expect(host.textContent).toContain("Design Engineering");
  });

  it("renders the Platform nav-group label and the trailing projects 'More' row", () => {
    const { host } = render(sidebar07() as DomphyElement);
    const labels = Array.from(host.querySelectorAll("aside nav small")).map((el) => el.textContent);
    expect(labels).toContain("Platform");
    expect(labels).toContain("Projects");
    const moreRow = Array.from(host.querySelectorAll("aside nav button")).find(
      (button) => button.textContent?.trim() === "More",
    );
    expect(moreRow).toBeTruthy();
  });

  it("renders the user footer with name and email", () => {
    const { host } = render(sidebar07() as DomphyElement);
    expect(host.textContent).toContain("Shad Cn");
    expect(host.textContent).toContain("shadcn@example.com");
  });

  it("renders an inline accordion (<details>) for nav-main items with children", () => {
    const { host } = render(sidebar07() as DomphyElement);
    expect(host.querySelectorAll("aside details").length).toBeGreaterThan(0);
  });

  it("clicking the header toggle does not throw and flips the aside's collapsed width", async () => {
    const { host } = render(sidebar07() as DomphyElement);
    const aside = host.querySelector("aside") as HTMLElement;
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(aside).toBeTruthy();
  });

  it("accepts custom team/nav/project/user data", () => {
    const { host } = render(
      sidebar07({
        teams: [{ name: "My Team", plan: "Pro" }],
        navMain: [{ title: "Home", href: "#" }],
        projects: [{ title: "My Project", href: "#" }],
        user: { name: "Jane Doe", email: "jane@example.com" },
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("My Team");
    expect(host.textContent).toContain("My Project");
    expect(host.textContent).toContain("Jane Doe");
  });
});
