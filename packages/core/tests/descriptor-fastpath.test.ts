// @vitest-environment jsdom
// Tests for two reconciliation fast paths:
//
// 1. ElementNode.patch() reference-equality skip — re-patching a reused node
//    with the EXACT same descriptor object is a no-op (identity means
//    "nothing changed"), while reactive functions inside that descriptor keep
//    their own state subscriptions and must keep updating.
// 2. StyleList.patchCSS() empty guard — patching a node whose style has no
//    flat properties must not create/insert an empty CSSOM rule (the
//    empty-rule churn regression: one 1,000-row swap used to insert 8,000).
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { flushSync } from "../src/index.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

describe("ElementNode.patch: descriptor reference-equality fast path", () => {
  it("patch() with the identical descriptor reference is a no-op; a fresh reference re-patches", () => {
    const desc = { div: "hello", title: "t" } as DomphyElement;
    const { node } = mount(desc);
    const el = node.domElement!;
    expect(el.textContent).toBe("hello");

    const spy = vi.spyOn(el, "setAttribute");
    node.patch(desc); // same reference → skip
    expect(spy).not.toHaveBeenCalled();
    expect(el.textContent).toBe("hello");
    expect(el.getAttribute("title")).toBe("t");

    node.patch({ div: "hello", title: "t" } as DomphyElement); // fresh reference → full patch
    expect(spy).toHaveBeenCalled();
    expect(el.textContent).toBe("hello");
    expect(el.getAttribute("title")).toBe("t");
  });

  it("reactive children of a same-reference descriptor keep updating from state", () => {
    const count = toState(0);
    const child = {
      span: (l: any) => `n:${count.get(l)}`,
      _key: "c",
    } as DomphyElement;
    const items = toState<DomphyElement[]>([child]);
    const { host } = mount({ div: (l: any) => items.get(l) } as DomphyElement);
    expect(host.textContent).toBe("n:0");

    // Re-render the list with the SAME child descriptor reference: the
    // keyed reuse hits the fast path and must NOT tear down the child's
    // own state subscription.
    items.set([child]);
    flushSync();
    expect(host.textContent).toBe("n:0");

    count.set(5);
    flushSync();
    expect(host.textContent).toBe("n:5");
  });

  it("keyed reorder with reused descriptor references keeps node identity and applies the new order", () => {
    const a = { li: "A", _key: "a" } as DomphyElement;
    const b = { li: "B", _key: "b" } as DomphyElement;
    const items = toState<DomphyElement[]>([a, b]);
    const { host } = mount({ ul: (l: any) => items.get(l) } as DomphyElement);

    const before = Array.from(host.querySelectorAll("li"));
    items.set([b, a]);
    flushSync();

    const after = Array.from(host.querySelectorAll("li"));
    expect(after[0]).toBe(before[1]); // same DOM element for key "b"
    expect(after[1]).toBe(before[0]); // same DOM element for key "a"
    expect(host.textContent).toBe("BA");
  });

  it("a fresh descriptor with changed content still patches through", () => {
    const items = toState<DomphyElement[]>([
      { li: "A", _key: "a" } as DomphyElement,
    ]);
    const { host } = mount({ ul: (l: any) => items.get(l) } as DomphyElement);
    expect(host.textContent).toBe("A");

    items.set([{ li: "B", _key: "a" } as DomphyElement]);
    flushSync();
    expect(host.textContent).toBe("B");
  });
});

describe("StyleList.patchCSS: empty guard", () => {
  it("patching a style-less reused node inserts no CSSOM rule", () => {
    const items = toState<DomphyElement[]>([
      { li: "x", _key: 1 } as DomphyElement,
    ]);
    mount({ ul: (l: any) => items.get(l) } as DomphyElement);

    const sheet =
      document.head.querySelector<HTMLStyleElement>("#domphy-style")!.sheet!;
    const before = sheet.cssRules.length;

    // Fresh descriptor reference (no style) → full patch runs → must not
    // insert an empty rule for the reused node.
    items.set([{ li: "x", _key: 1 } as DomphyElement]);
    flushSync();
    expect(sheet.cssRules.length).toBe(before);
  });

  it("a patch introducing flat styles still creates the rule", () => {
    const items = toState<DomphyElement[]>([
      { li: "x", _key: 1 } as DomphyElement,
    ]);
    mount({ ul: (l: any) => items.get(l) } as DomphyElement);

    const sheet =
      document.head.querySelector<HTMLStyleElement>("#domphy-style")!.sheet!;
    const before = sheet.cssRules.length;

    items.set([{ li: "x", _key: 1, style: { color: "red" } } as DomphyElement]);
    flushSync();
    expect(sheet.cssRules.length).toBe(before + 1);
  });
});
