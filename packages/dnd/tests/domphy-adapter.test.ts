// @vitest-environment jsdom

import type { DomphyElement, State } from "@domphy/core";
import { ElementNode, State as StateClass, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { dragDrop, parents, setParentValues } from "../src/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// dragDrop()'s behavior attach defers dragAndDrop() registration by two
// chained requestAnimationFrame calls (Domphy fires Mount before rendering
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

describe("dragDrop cross-generation re-renders (reused-node behavior)", () => {
  it("re-binds when a re-render swaps the State instance on the SAME ul node", async () => {
    const listA = toState<Item[]>([{ id: 1, label: "A" }]);
    const listB = toState<Item[]>([{ id: 9, label: "Z" }]);
    // `new State(...)` deliberately — toState(listA) would return listA itself.
    const current = new StateClass<State<Item[]>>(listA);

    const { host, node } = mount({
      div: (l) => {
        const items = current.get(l);
        return {
          ul: (ll: Parameters<State<Item[]>["get"]>[0]) =>
            items.get(ll).map((item) => ({ li: item.label, _key: item.id })),
          $: [dragDrop(items)],
        };
      },
    } as DomphyElement);

    await waitFrame();
    await waitFrame();
    const ul = host.querySelector("ul") as HTMLUListElement;

    // The initial registration is bound to listA.
    const firstData = parents.get(ul);
    expect(firstData).toBeDefined();
    setParentValues(ul, firstData as never, [{ id: 2, label: "B" }]);
    expect(listA.get().map((item) => item.id)).toEqual([2]);

    // Cross-generation re-render: the ul node is REUSED (same position), the
    // dragDrop() factory re-runs with listB, and behavior() routes the new
    // props into the live instance — which must re-register against listB.
    current.set(listB);
    await flush();
    await waitFrame();
    await waitFrame();

    const secondData = parents.get(ul);
    expect(secondData).toBeDefined();
    setParentValues(ul, secondData as never, [{ id: 7, label: "Q" }]);

    // The new binding drives listB; listA is left untouched.
    expect(listB.get().map((item) => item.id)).toEqual([7]);
    expect(listA.get().map((item) => item.id)).toEqual([2]);

    node.remove();
  });

  it("applies a changed config (dragHandle) after a re-render on the same node", async () => {
    const items = toState<Item[]>([{ id: 1, label: "A" }]);
    const handleSelector = toState(".handle-a");

    const { host, node } = mount({
      div: (l) => ({
        ul: (ll: Parameters<State<Item[]>["get"]>[0]) =>
          items.get(ll).map((item) => ({ li: item.label, _key: item.id })),
        $: [dragDrop(items, { dragHandle: handleSelector.get(l) })],
      }),
    } as DomphyElement);

    await waitFrame();
    await waitFrame();
    const ul = host.querySelector("ul") as HTMLUListElement;
    expect(parents.get(ul)?.config.dragHandle).toBe(".handle-a");

    // Only the config changed — the behavior must tear down and re-register
    // with the new dragHandle instead of keeping generation 1's config.
    handleSelector.set(".handle-b");
    await flush();
    await waitFrame();
    await waitFrame();

    expect(parents.get(ul)?.config.dragHandle).toBe(".handle-b");

    node.remove();
  });

  it("does not re-register when a re-render passes an unchanged state and config", async () => {
    const items = toState<Item[]>([
      { id: 1, label: "A" },
      { id: 2, label: "B" },
    ]);
    const tick = toState(0);

    const { host, node } = mount({
      div: (l) => {
        tick.get(l);
        return {
          ul: (ll: Parameters<State<Item[]>["get"]>[0]) =>
            items.get(ll).map((item) => ({ li: item.label, _key: item.id })),
          // No config argument: the frozen shared default keeps the props
          // referentially stable across generations.
          $: [dragDrop(items)],
        };
      },
    } as DomphyElement);

    await waitFrame();
    await waitFrame();
    const ul = host.querySelector("ul") as HTMLUListElement;
    const before = parents.get(ul);
    expect(before).toBeDefined();

    // Force a cross-generation re-render with identical props. The FormKit
    // registration must survive untouched (no tearDown/re-register churn).
    tick.set(1);
    await flush();
    await waitFrame();
    await waitFrame();

    expect(parents.get(ul)).toBe(before);

    node.remove();
  });
});
