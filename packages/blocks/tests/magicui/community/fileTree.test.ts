// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fileTree } from "../../../src/magicui/community/fileTree.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function flush() {
  return new Promise<void>((r) => setTimeout(r, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("fileTree", () => {
  it("renders a working demo with zero args: a tree with the default folder pre-expanded", () => {
    const { host } = render(fileTree() as DomphyElement);
    const root = host.querySelector('[role="tree"]')!;
    expect(root).toBeTruthy();
    const treeItems = host.querySelectorAll('[role="treeitem"]');
    expect(treeItems.length).toBeGreaterThan(0);
    // "src" is expanded by default, so its top-level children are present.
    expect(host.textContent).toContain("index.ts");
  });

  it("clicking a collapsed folder row expands it (aria-expanded flips to true)", async () => {
    const onToggle = vi.fn();
    const { host } = render(
      fileTree({
        data: [
          {
            id: "docs",
            name: "docs",
            type: "folder",
            children: [{ id: "docs/a.md", name: "a.md", type: "file" }],
          },
        ],
        expandedIds: [],
        onToggle,
      }) as DomphyElement,
    );
    const folderRow = host.querySelector('[role="treeitem"][aria-expanded]')!;
    expect(folderRow.getAttribute("aria-expanded")).toBe("false");
    (folderRow as HTMLElement).click();
    await flush();
    expect(folderRow.getAttribute("aria-expanded")).toBe("true");
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "docs" }), true);
  });

  it("clicking a file row selects it and calls onSelect", async () => {
    const onSelect = vi.fn();
    const { host } = render(
      fileTree({
        data: [{ id: "a.ts", name: "a.ts", type: "file" }],
        onSelect,
      }) as DomphyElement,
    );
    const fileRow = host.querySelector('[role="treeitem"][aria-selected]')!;
    expect(fileRow.getAttribute("aria-selected")).toBe("false");
    (fileRow as HTMLElement).click();
    await flush();
    expect(fileRow.getAttribute("aria-selected")).toBe("true");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "a.ts" }));
  });
});
