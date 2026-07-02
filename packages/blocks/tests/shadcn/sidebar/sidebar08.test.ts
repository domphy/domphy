// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar08 } from "../../../src/shadcn/sidebar/sidebar08.ts";

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

describe("sidebar08", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar08() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders the team switcher, nav-main groups, projects and secondary nav", () => {
    const { host } = render(sidebar08() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc");
    expect(host.textContent).toContain("Playground");
    expect(host.textContent).toContain("Design Engineering");
    expect(host.textContent).toContain("Support");
    expect(host.textContent).toContain("Feedback");
  });

  it("renders the user footer with name and email", () => {
    const { host } = render(sidebar08() as DomphyElement);
    expect(host.textContent).toContain("Shad Cn");
    expect(host.textContent).toContain("shadcn@example.com");
  });

  it("secondary nav links carry no aria-current active-state marker", () => {
    const { host } = render(sidebar08() as DomphyElement);
    const secondaryLinks = Array.from(host.querySelectorAll("aside a")).filter((a) =>
      a.textContent?.includes("Support") || a.textContent?.includes("Feedback"),
    );
    expect(secondaryLinks.length).toBeGreaterThan(0);
    secondaryLinks.forEach((a) => expect(a.hasAttribute("aria-current")).toBe(false));
  });

  it("clicking the header toggle does not throw", () => {
    const { host } = render(sidebar08() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts custom secondary nav data", () => {
    const { host } = render(
      sidebar08({
        secondaryNav: [{ title: "Help Center", href: "#" }],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Help Center");
    expect(host.textContent).not.toContain("Feedback");
  });
});
