// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { dragDrop, parents, setParentValues } from "../src/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// dragDrop()'s _onMount defers dragAndDrop() registration by two chained
// requestAnimationFrame calls (Domphy fires _onMount before rendering
// children, so the adapter waits for post-paint DOM to exist — see
// dragDrop.ts). A single setTimeout(0) macrotask resolves before either rAF
// callback runs in jsdom; wait for both frames before touching FormKit's
// internal `parents` registry.
const waitFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { node, host };
}

type Item = { id: number; label: string };

describe("dragDrop reorder -> bound State", () => {
  it("FormKit's setValues (wired by the adapter) updates the State and re-renders", async () => {
    const items = toState<Item[]>([
      { id: 1, label: "A" },
      { id: 2, label: "B" },
      { id: 3, label: "C" },
    ]);

    const { host, node } = mount({
      ul: (l) =>
        items.get(l).map((item) => ({ li: item.label, _key: item.id })),
      $: [dragDrop(items)],
    } as DomphyElement);

    const ul = host.querySelector("ul") as HTMLUListElement;
    expect(
      Array.from(ul.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["A", "B", "C"]);

    // dragAndDrop() registration is deferred by two rAF calls (see dragDrop.ts).
    await waitFrame();
    await waitFrame();

    // The adapter passes `setValues: (next) => values.set(next)` into FormKit.
    // FormKit stores that callback as `parentData.setValues`. Driving a reorder
    // through FormKit's public `setParentValues` therefore exercises the exact
    // wire the adapter installed, without simulating raw pointer drags.
    const parentData = parents.get(ul);
    expect(parentData).toBeDefined();

    const reordered: Item[] = [
      { id: 3, label: "C" },
      { id: 1, label: "A" },
      { id: 2, label: "B" },
    ];
    setParentValues(ul, parentData as never, reordered);

    // The bound Domphy State received the new order.
    expect(items.get().map((item) => item.id)).toEqual([3, 1, 2]);

    // And the keyed children re-rendered to match (re-render is batched).
    await flush();
    expect(
      Array.from(ul.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["C", "A", "B"]);

    node.remove();
  });

  it("mount+remove within the same paint cycle does not leak a FormKit registration", async () => {
    const items = toState<Item[]>([{ id: 1, label: "A" }]);

    const { host, node } = mount({
      ul: (l) =>
        items.get(l).map((item) => ({ li: item.label, _key: item.id })),
      $: [dragDrop(items)],
    } as DomphyElement);

    const ul = host.querySelector("ul") as HTMLUListElement;

    // Remove before either deferred rAF fires — this is the race the
    // dragDrop() `disposed` guard closes: without it, the still-pending rAF
    // callback below would register `ul` into FormKit's `parents` WeakMap
    // (plus a MutationObserver and parent-level listeners) after teardown.
    node.remove();

    await waitFrame();
    await waitFrame();

    expect(parents.get(ul)).toBeUndefined();
  });
});
