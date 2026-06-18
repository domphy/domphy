// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

function mountApp(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

// Sum of all listener-set sizes on a State's internal Notifier.
function listenerCount(state: any): number {
  const listeners = state?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("lifecycle: async removal (_onBeforeRemove done)", () => {
  it("defers list-item removal until done() is invoked", async () => {
    const items = toState([1, 2], "deferItems");
    const dones: Record<number, () => void> = {};
    const App = {
      ul: (l: any) =>
        items.get(l).map((n: number) => ({
          li: String(n),
          _key: n,
          _onBeforeRemove: (_node: any, done: () => void) => {
            dones[n] = done;
          },
        })),
    } as DomphyElement;

    const { host } = mountApp(App);
    expect(host.querySelectorAll("li").length).toBe(2);

    items.set([1]); // remove key 2
    await flush();
    // still present — removal is deferred until done()
    expect(host.querySelectorAll("li").length).toBe(2);
    expect(typeof dones[2]).toBe("function");

    dones[2]();
    expect(host.querySelectorAll("li").length).toBe(1);
    expect(host.querySelector("li")!.textContent).toBe("1");
  });

  it("auto-completes removal for a sync cleanup hook with no done param", async () => {
    const items = toState([1, 2], "syncItems");
    let cleaned = 0;
    const App = {
      ul: (l: any) =>
        items.get(l).map((n: number) => ({
          li: String(n),
          _key: n,
          _onBeforeRemove: (_node: any) => {
            cleaned++;
          },
        })),
    } as DomphyElement;

    const { host } = mountApp(App);
    items.set([1]);
    await flush();
    expect(cleaned).toBe(1);
    expect(host.querySelectorAll("li").length).toBe(1);
  });

  it("removes the correct item when a deferred removal completes after a concurrent insert", async () => {
    const items = toState(["a", "b", "c"], "staleItems");
    const dones: Record<string, () => void> = {};
    const App = {
      ul: (l: any) =>
        items.get(l).map((s: string) => ({
          li: s,
          _key: s,
          _onBeforeRemove: (_n: any, done: () => void) => {
            dones[s] = done;
          },
        })),
    } as DomphyElement;

    const { host } = mountApp(App);
    items.set(["a", "c"]); // defer-remove "b"
    await flush();
    expect(host.querySelectorAll("li").length).toBe(3);

    items.set(["a", "c", "d"]); // insert "d" while "b" still leaving
    await flush();

    dones.b(); // complete "b" removal after positions shifted
    const texts = Array.from(host.querySelectorAll("li")).map(
      (li) => li.textContent,
    );
    expect(texts).not.toContain("b");
    expect(texts).toEqual(expect.arrayContaining(["a", "c", "d"]));
  });
});

describe("lifecycle: subtree teardown fires hooks + releases subscriptions", () => {
  it("fires BeforeRemove and Remove for descendants when an ancestor is removed", async () => {
    const order: string[] = [];
    const show = toState(true, "showSub");
    const App = {
      div: (l: any) =>
        show.get(l)
          ? [
              {
                section: [
                  {
                    p: "child",
                    _onBeforeRemove: (_n: any, d: () => void) => {
                      order.push("child-before");
                      d();
                    },
                    _onRemove: () => order.push("child-remove"),
                  },
                ],
                _onRemove: () => order.push("parent-remove"),
              },
            ]
          : [],
    } as DomphyElement;

    const { node } = mountApp(App);
    show.set(false);
    await flush();
    expect(order).toContain("child-before");
    expect(order).toContain("child-remove");
    expect(order).toContain("parent-remove");
    node.remove();
  });

  it("releases descendant reactive subscriptions when an ancestor is removed (no leak)", async () => {
    const color = toState("red", "leakColor");
    const show = toState(true, "leakShow");
    const App = {
      div: (l: any) =>
        show.get(l)
          ? [{ section: [{ span: (l2: any) => color.get(l2) }] }]
          : [],
    } as DomphyElement;

    mountApp(App);
    expect(listenerCount(color)).toBe(1);

    show.set(false);
    await flush();
    expect(listenerCount(color)).toBe(0);
  });

  it("fires hooks and releases subscriptions on root remove()", () => {
    const color = toState("red", "rootColor");
    let removed = false;
    const node = new ElementNode({
      div: (l: any) => color.get(l),
      _onRemove: () => {
        removed = true;
      },
    } as DomphyElement);
    const host = document.createElement("div");
    document.body.appendChild(host);
    node.render(host);

    expect(listenerCount(color)).toBe(1);
    node.remove();
    expect(removed).toBe(true);
    expect(listenerCount(color)).toBe(0);
  });

  it("does not double-fire a node's Remove hook on normal list removal", async () => {
    const items = toState([1, 2], "onceItems");
    const removeCounts: Record<number, number> = {};
    const App = {
      ul: (l: any) =>
        items.get(l).map((n: number) => ({
          li: String(n),
          _key: n,
          _onRemove: () => {
            removeCounts[n] = (removeCounts[n] ?? 0) + 1;
          },
        })),
    } as DomphyElement;

    mountApp(App);
    items.set([1]);
    await flush();
    expect(removeCounts[2]).toBe(1);
  });
});
