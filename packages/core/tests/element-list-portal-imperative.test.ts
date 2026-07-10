// @vitest-environment jsdom
// Regression coverage for ElementList's handling of portal/imperative nodes
// and mid-removal ("ghost") nodes:
//
// 1. A portal item occupies a logical slot in `items` while its DOM lives
//    elsewhere — positional DOM references (childNodes[i], items[i+1]) used
//    to throw NotFoundError on keyed reorders or silently misplace inserts.
// 2. Nodes inserted imperatively via children.insert() (floating panels,
//    _onInit-inserted subtrees) used to be pruned as "stale extras" by the
//    very next declared-children reconciliation of the same list.
// 3. A keyed node whose async BeforeRemove (exit animation) was still in
//    flight used to be "resurrected" by a re-added key — then the original
//    deferred done() destroyed the live, freshly-patched node.

import { describe, expect, it, vi } from "vitest";
import type { DomphyElement } from "../src/index.ts";
import { ElementNode, flushSync, toState } from "../src/index.ts";

function mountApp(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function makePortalInput(text: string): DomphyElement {
  return {
    div: text,
    _portal: () => {
      const overlay = document.createElement("div");
      document.body.appendChild(overlay);
      return overlay;
    },
  } as DomphyElement;
}

describe("portal items and positional DOM references", () => {
  it("keyed reorder moving a sibling next to an appended portal does not throw and orders the DOM correctly", () => {
    const { node } = mountApp({
      div: [
        { div: "X", _key: "x" },
        { div: "Y", _key: "y" },
        { div: "Z", _key: "z" },
      ],
    } as DomphyElement);
    const list = node.children!;
    list.insert(makePortalInput("PORTAL"));

    expect(() =>
      list.update([
        { div: "Y", _key: "y" },
        { div: "Z", _key: "z" },
        { div: "X", _key: "x" },
      ]),
    ).not.toThrow();

    const texts = Array.from(node.domElement!.children).map(
      (child) => child.textContent,
    );
    expect(texts).toEqual(["Y", "Z", "X"]);
  });

  it("keyed reorder with the portal sitting in the MIDDLE of items does not throw", () => {
    const { node } = mountApp({
      div: [
        { div: "A", _key: "a" },
        { div: "C", _key: "c" },
        { div: "D", _key: "d" },
      ],
    } as DomphyElement);
    const list = node.children!;
    list.insert(makePortalInput("PORTAL"), 1);

    expect(() =>
      list.update([
        { div: "A", _key: "a" },
        { div: "D", _key: "d" },
        { div: "C", _key: "c" },
      ]),
    ).not.toThrow();

    const texts = Array.from(node.domElement!.children).map(
      (child) => child.textContent,
    );
    expect(texts).toEqual(["A", "D", "C"]);
  });

  it("insert() lands at the right DOM position when a portal sits earlier in items", () => {
    const { node } = mountApp({
      div: [{ span: "A" }, { span: "C" }],
    } as DomphyElement);
    const list = node.children!;
    list.insert(makePortalInput("PORTAL"), 1); // items: [A, portal, C]

    list.insert({ span: "D" } as DomphyElement, 2); // logical: [A, portal, D, C]

    const texts = Array.from(node.domElement!.children).map(
      (child) => child.textContent,
    );
    expect(texts).toEqual(["A", "D", "C"]);
  });
});

describe("imperatively-inserted nodes survive declared reconciliation", () => {
  it("a reactive re-render of the root's function children keeps an imperatively-inserted portal panel", () => {
    const refresh = toState(0);
    const { host, node } = mountApp({
      div: (l: any) => {
        refresh.get(l);
        return [{ p: `render ${refresh.get(l)}` }];
      },
    } as DomphyElement);

    node.children!.insert(makePortalInput("PANEL"));
    expect(document.body.textContent).toContain("PANEL");

    refresh.set(1);
    flushSync();
    expect(host.textContent).toContain("render 1");
    expect(document.body.textContent).toContain("PANEL");

    refresh.set(2);
    flushSync();
    expect(document.body.textContent).toContain("PANEL");
  });

  it("a non-portal imperative insert also survives, while declared extras are still pruned", () => {
    const items = toState([1, 2, 3]);
    const { node } = mountApp({
      div: (l: any) =>
        items.get(l).map((id: number) => ({ p: `item ${id}`, _key: id })),
    } as DomphyElement);

    node.children!.insert({ aside: "IMPERATIVE" } as DomphyElement);
    expect(node.domElement!.textContent).toContain("IMPERATIVE");

    items.set([1]); // declared extras (2, 3) must go, imperative stays
    flushSync();
    const text = node.domElement!.textContent!;
    expect(text).toContain("item 1");
    expect(text).not.toContain("item 2");
    expect(text).not.toContain("item 3");
    expect(text).toContain("IMPERATIVE");
  });
});

describe("keyed re-add during an in-flight async removal", () => {
  it("does not resurrect the exiting node, and the stale done() does not destroy the fresh one", () => {
    vi.useFakeTimers();
    try {
      const removedNodes: string[] = [];
      const makeItem = (label: string) =>
        ({
          li: label,
          _key: "k",
          _onBeforeRemove: (_node: ElementNode, done: () => void) => {
            setTimeout(done, 300); // async exit animation
          },
          _onRemove: () => removedNodes.push(label),
        }) as DomphyElement;

      const { node } = mountApp({ ul: [makeItem("first")] } as DomphyElement);
      const list = node.children!;
      const originalLi = node.domElement!.querySelector("li");

      list.update([]); // removal deferred behind the 300ms exit animation
      expect(node.domElement!.querySelectorAll("li").length).toBe(1);

      list.update([makeItem("second")]); // same key re-added mid-exit
      const liElements = node.domElement!.querySelectorAll("li");
      const labels = Array.from(liElements).map((li) => li.textContent);
      expect(labels).toContain("second");
      // The fresh node must be a NEW element, not the exiting ghost.
      const fresh = Array.from(liElements).find(
        (li) => li.textContent === "second",
      );
      expect(fresh).not.toBe(originalLi);

      // The ghost's deferred done() fires: it must remove ONLY the ghost.
      vi.advanceTimersByTime(400);
      const remaining = Array.from(
        node.domElement!.querySelectorAll("li"),
      ).map((li) => li.textContent);
      expect(remaining).toEqual(["second"]);
      expect(removedNodes).toEqual(["first"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("reactive attribute re-set on patch()", () => {
  it("does not grow the BeforeRemove hook chain — one registration per attribute, ever", () => {
    const active = toState(false);
    const makeElement = () =>
      ({
        button: "go",
        disabled: (l: any) => active.get(l),
      }) as DomphyElement;

    const { node } = mountApp({ div: [makeElement()] } as DomphyElement);
    const buttonNode = node.children!.items[0] as ElementNode;

    const addHookSpy = vi.spyOn(buttonNode, "addHook");
    for (let i = 0; i < 5; i++) buttonNode.patch(makeElement());
    const beforeRemoveRegistrations = addHookSpy.mock.calls.filter(
      (call) => call[0] === "BeforeRemove",
    );
    expect(beforeRemoveRegistrations.length).toBe(0);

    // The binding still works after repeated patches.
    active.set(true);
    flushSync();
    expect(buttonNode.domElement!.hasAttribute("disabled")).toBe(true);
  });
});

describe("function-children re-setup on patch()", () => {
  it("does not grow the BeforeRemove hook chain and fully releases the previous generation's subscriptions", () => {
    const stateA = toState(0);
    const stateB = toState(0);
    const executions: string[] = [];
    const makeChildren = (generation: string) => (l: any) => {
      stateA.get(l);
      stateB.get(l);
      executions.push(generation);
      return [{ p: generation }];
    };

    const { node } = mountApp({
      div: makeChildren("gen1"),
    } as DomphyElement);

    const addHookSpy = vi.spyOn(node, "addHook");
    for (let i = 2; i <= 6; i++) {
      node.patch({ div: makeChildren(`gen${i}`) } as DomphyElement);
    }
    const beforeRemoveRegistrations = addHookSpy.mock.calls.filter(
      (call) => call[0] === "BeforeRemove",
    );
    // The children-release hook registers once per NODE (at construction) —
    // five patch() re-setups must not add five more layers.
    expect(beforeRemoveRegistrations.length).toBe(0);

    // A previous generation's listener must be fully unsubscribed from EVERY
    // dependency (not just the last one): setting stateA must re-run ONLY the
    // live gen6 closure.
    executions.length = 0;
    stateA.set(1);
    flushSync();
    expect(executions).toEqual(["gen6"]);
    expect(node.domElement!.textContent).toBe("gen6");
  });
});
