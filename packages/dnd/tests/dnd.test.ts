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

  it("dragDrop returns a patch declaring a per-node behavior", () => {
    // The FormKit registration lives in a behavior() instance (attach once
    // per real node, later generations routed through update()) — not in
    // _onMount/_onRemove closures, which only ever run for generation 1 on a
    // reused node.
    const patch = dragDrop(toState<{ id: number }[]>([]));
    expect(patch._behaviors).toBeDefined();
    expect(typeof patch._behaviors?.["domphy:dnd"]?.attach).toBe("function");
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
