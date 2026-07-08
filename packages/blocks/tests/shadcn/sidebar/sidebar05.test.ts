// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar05 } from "../../../src/shadcn/sidebar/sidebar05.ts";

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

describe("sidebar05", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar05() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders one <details> per nav group, with the defaultOpen group already open", () => {
    const { host } = render(sidebar05() as DomphyElement);
    const groups = host.querySelectorAll("aside details");
    expect(groups.length).toBe(5);
    expect(host.querySelector("aside details[open]")).toBeTruthy();
  });

  it("renders the search input and breadcrumb trail", () => {
    const { host } = render(sidebar05() as DomphyElement);
    expect(host.querySelector('input[type="search"]')).toBeTruthy();
    expect(host.querySelector("nav[aria-label='breadcrumb']")).toBeTruthy();
  });

  it("marks the active sub-link with aria-current=page", () => {
    const { host } = render(sidebar05() as DomphyElement);
    expect(host.querySelector('a[aria-current="page"]')).toBeTruthy();
  });

  it("clicking the header toggle button does not throw", () => {
    const { host } = render(sidebar05() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts custom nav data and breadcrumb items", () => {
    const { host } = render(
      sidebar05({
        navGroups: [
          { title: "Custom", items: [{ title: "One", href: "#one" }] },
        ],
        breadcrumbItems: [{ label: "Home", href: "/" }, { label: "Custom" }],
      }) as DomphyElement,
    );
    expect(host.querySelectorAll("aside details").length).toBe(1);
    expect(host.textContent).toContain("Custom");
  });
});
