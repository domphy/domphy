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

describe("#3 keyed reconciliation reflects new data on the reused node", () => {
  it("updates text content for a reused key", async () => {
    const items = toState([{ id: 1, t: "a" }], "k1");
    const { host } = mountApp({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({ li: it.t, _key: it.id })),
    } as DomphyElement);

    const li = host.querySelector("li")!;
    expect(li.textContent).toBe("a");

    items.set([{ id: 1, t: "b" }]);
    await flush();

    expect(host.querySelector("li")).toBe(li); // same element reused
    expect(li.textContent).toBe("b"); // content updated (not stale)
  });

  it("updates an attribute for a reused key", async () => {
    const items = toState([{ id: 1, title: "T1" }], "k2");
    const { host } = mountApp({
      ul: (l: any) =>
        items
          .get(l)
          .map((it: any) => ({ li: "x", _key: it.id, title: it.title })),
    } as DomphyElement);

    const li = host.querySelector("li")!;
    expect(li.getAttribute("title")).toBe("T1");

    items.set([{ id: 1, title: "T2" }]);
    await flush();

    expect(host.querySelector("li")).toBe(li);
    expect(li.getAttribute("title")).toBe("T2");
  });

  it("updates nested children for a reused key while preserving the outer element", async () => {
    const items = toState([{ id: "r", v: "v1" }], "k3");
    const { host } = mountApp({
      div: (l: any) =>
        items.get(l).map((it: any) => ({ div: [{ span: it.v }], _key: it.id })),
    } as DomphyElement);

    const outer = host.querySelector("div > div")!;
    expect(outer.querySelector("span")!.textContent).toBe("v1");

    items.set([{ id: "r", v: "v2" }]);
    await flush();

    expect(host.querySelector("div > div")).toBe(outer); // outer reused
    expect(outer.querySelector("span")!.textContent).toBe("v2");
  });

  it("reorders by key, preserving identity AND updating data", async () => {
    const items = toState(
      [
        { id: 1, t: "a" },
        { id: 2, t: "b" },
      ],
      "k4",
    );
    const { host } = mountApp({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({ li: it.t, _key: it.id })),
    } as DomphyElement);

    const firstLi = host.querySelectorAll("li")[0]; // key 1

    items.set([
      { id: 2, t: "B" },
      { id: 1, t: "A" },
    ]);
    await flush();

    const after = Array.from(host.querySelectorAll("li"));
    expect(after.map((li) => li.textContent)).toEqual(["B", "A"]);
    expect(after[1]).toBe(firstLi); // key 1 node reused, moved to the end, content updated
  });

  it("refreshes an event handler closure on a reused key (live dispatch)", async () => {
    const items = toState([{ id: 1, n: "a" }], "k5");
    let clicked = "";
    const { host } = mountApp({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({
          li: it.n,
          _key: it.id,
          onClick: () => {
            clicked = it.n;
          },
        })),
    } as DomphyElement);

    host.querySelector("li")!.dispatchEvent(new window.MouseEvent("click"));
    expect(clicked).toBe("a");

    items.set([{ id: 1, n: "b" }]); // same key, new closure
    await flush();
    host.querySelector("li")!.dispatchEvent(new window.MouseEvent("click"));
    expect(clicked).toBe("b"); // not the stale "a"
  });

  it("replaces (does not reuse) when the same key changes tag", async () => {
    const items = toState<any[]>([{ div: "x", _key: 1 }], "k6");
    const { host } = mountApp({
      section: (l: any) => items.get(l),
    } as DomphyElement);
    expect(host.querySelector("div")!.textContent).toBe("x");

    items.set([{ span: "y", _key: 1 }]);
    await flush();
    expect(host.querySelector("div")).toBeNull();
    expect(host.querySelector("span")!.textContent).toBe("y");
  });

  it("keeps reactive inner content working on a reused key", async () => {
    const tick = toState(0, "k7tick");
    const items = toState([{ id: 1 }], "k7");
    const { host } = mountApp({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({
          li: (l2: any) => `n=${tick.get(l2)}`,
          _key: it.id,
        })),
    } as DomphyElement);

    const li = host.querySelector("li")!;
    expect(li.textContent).toBe("n=0");

    items.set([{ id: 1 }]); // re-render keeps the reactive li
    await flush();
    expect(host.querySelector("li")).toBe(li);

    tick.set(3);
    await flush();
    expect(li.textContent).toBe("n=3"); // reactive content still live
  });
});

describe("#11 unkeyed lists reuse DOM by position (preserve focus/value/scroll)", () => {
  it("preserves focus and uncontrolled value of an input across an unkeyed update", async () => {
    const items = toState([{ v: "x" }, { v: "y" }], "u1");
    const { host } = mountApp({
      div: (l: any) =>
        items.get(l).map((it: any) => ({ input: null, placeholder: it.v })),
    } as DomphyElement);

    const inputs = host.querySelectorAll("input");
    const second = inputs[1] as HTMLInputElement;
    second.value = "typed-by-user";
    second.focus();
    expect(document.activeElement).toBe(second);

    items.set([{ v: "X" }, { v: "Y" }]); // new data, still unkeyed
    await flush();

    const after = host.querySelectorAll("input");
    expect(after[1]).toBe(second); // same DOM element reused by position
    expect(document.activeElement).toBe(second); // focus preserved
    expect((after[1] as HTMLInputElement).value).toBe("typed-by-user"); // value preserved
    expect((after[1] as HTMLInputElement).placeholder).toBe("Y"); // data updated
  });

  it("updates text content positionally without growing the list", async () => {
    const items = toState(["a", "b", "c"], "u2");
    const { host } = mountApp({
      ul: (l: any) => items.get(l).map((t: string) => ({ li: t })),
    } as DomphyElement);
    expect(
      Array.from(host.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["a", "b", "c"]);

    items.set(["a", "b", "d"]);
    await flush();
    expect(
      Array.from(host.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["a", "b", "d"]);
  });

  it("preserves a nested input's focus when a keyed row is reordered", async () => {
    const rows = toState([{ id: 1 }, { id: 2 }], "u3");
    const { host } = mountApp({
      div: (l: any) =>
        rows.get(l).map((r: any) => ({
          div: [{ input: null, placeholder: `row${r.id}` }],
          _key: r.id,
        })),
    } as DomphyElement);

    const row1Input = host.querySelectorAll("input")[0] as HTMLInputElement;
    row1Input.value = "hello";
    row1Input.focus();

    rows.set([{ id: 2 }, { id: 1 }]); // reorder
    await flush();

    const inputsAfter = host.querySelectorAll("input");
    expect(inputsAfter[1]).toBe(row1Input); // row 1's nested input reused after move
    expect(document.activeElement).toBe(row1Input);
    expect(row1Input.value).toBe("hello");
  });
});

describe("reconciliation does not leak listeners across patches", () => {
  it("releases the old reactive-attribute subscription when a reused node is patched", async () => {
    const color = toState("red", "patchColor");
    const items = toState([{ id: 1 }], "patchItems");
    const { node } = mountApp({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({
          li: "x",
          _key: it.id,
          dataColor: (l2: any) => color.get(l2),
        })),
    } as DomphyElement);

    expect(listenerCount(color)).toBe(1);

    items.set([{ id: 1 }]); // patch same key several times
    await flush();
    items.set([{ id: 1 }]);
    await flush();
    expect(listenerCount(color)).toBe(1); // not accumulating one per patch

    node.remove();
    expect(listenerCount(color)).toBe(0); // fully released on removal
  });
});
