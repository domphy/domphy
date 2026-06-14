// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { animations, dragAndDrop, dragDrop, insert } from "../src/index";

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { node, host };
}

describe("@domphy/dnd", () => {
  it("re-exports the FormKit engine alongside the adapter", () => {
    expect(typeof dragDrop).toBe("function");
    expect(typeof dragAndDrop).toBe("function"); // core engine
    expect(typeof animations).toBe("function"); // a plugin
    expect(typeof insert).toBe("function");
  });

  it("dragDrop returns a patch with mount/remove lifecycle", () => {
    const patch = dragDrop(toState<{ id: number }[]>([]));
    expect(typeof patch._onMount).toBe("function");
    expect(typeof patch._onRemove).toBe("function");
  });

  it("wires FormKit onto the list container without throwing", () => {
    const items = toState([
      { id: 1, label: "A" },
      { id: 2, label: "B" },
      { id: 3, label: "C" },
    ]);
    let host: HTMLElement | undefined;
    let node: ElementNode | undefined;
    expect(() => {
      ({ host, node } = mount({
        ul: (l) =>
          items.get(l).map((item) => ({ li: item.label, _key: item.id })),
        $: [dragDrop(items)],
      } as DomphyElement));
    }).not.toThrow();

    const ul = host?.querySelector("ul");
    expect(ul?.querySelectorAll("li").length).toBe(3);

    // teardown on removal should not throw
    expect(() => node?.remove()).not.toThrow();
  });
});
