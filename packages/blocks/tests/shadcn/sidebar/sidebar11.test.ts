// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar11 } from "../../../src/shadcn/sidebar/sidebar11.ts";

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

describe("sidebar11", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar11() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders the recursive folder/file tree with the top-level folders", () => {
    const { host } = render(sidebar11() as DomphyElement);
    expect(host.textContent).toContain("app");
    expect(host.textContent).toContain("components");
    expect(host.textContent).toContain("lib");
    expect(host.textContent).toContain("public");
    expect(host.textContent).toContain("button.tsx");
  });

  it("renders the Changes group and both group labels above the tree", () => {
    const { host } = render(sidebar11() as DomphyElement);
    const labels = Array.from(
      host.querySelectorAll("aside nav > div small"),
    ).map((el) => el.textContent);
    expect(labels).toContain("Changes");
    expect(labels).toContain("Files");
    // The three default changed files, each with a git-status badge (M/U/M).
    const badges = Array.from(
      host.querySelectorAll("aside [data-slot='badge']"),
    ).map((el) => el.textContent);
    expect(badges).toEqual(["M", "U", "M"]);
    expect(host.textContent).toContain("api/hello/route.ts");
  });

  it("pre-expands the ancestor folders of the active file", () => {
    const { host } = render(sidebar11() as DomphyElement);
    const detailsElements = Array.from(host.querySelectorAll("aside details"));
    const openSummaries = detailsElements
      .filter((el) => el.hasAttribute("open"))
      .map((el) => el.querySelector("summary")?.textContent ?? "");
    expect(openSummaries.some((text) => text.includes("components"))).toBe(
      true,
    );
    expect(openSummaries.some((text) => text.includes("ui"))).toBe(true);
  });

  it("marks the active file with aria-current=true", () => {
    const { host } = render(sidebar11() as DomphyElement);
    const active = host.querySelector('aside button[aria-current="true"]');
    expect(active?.textContent).toContain("button.tsx");
  });

  it("clicking a file row makes it active and updates the header breadcrumb", async () => {
    const { host } = render(sidebar11() as DomphyElement);
    const cardButton = Array.from(host.querySelectorAll("aside button")).find(
      (button) => button.textContent?.includes("card.tsx"),
    ) as HTMLButtonElement;
    expect(cardButton).toBeTruthy();
    cardButton.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(cardButton.getAttribute("aria-current")).toBe("true");
    expect(host.querySelector("header")?.textContent).toContain("card.tsx");
  });

  it("clicking the header toggle does not throw", () => {
    const { host } = render(sidebar11() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts a custom tree and active file path", () => {
    const { host } = render(
      sidebar11({
        tree: [
          {
            type: "folder",
            name: "src",
            children: [{ type: "file", name: "index.ts" }],
          },
        ],
        activeFilePath: "src/index.ts",
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("index.ts");
    expect(host.querySelector("header")?.textContent).toContain("index.ts");
  });
});
