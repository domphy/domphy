// @vitest-environment node
// Real SSR test: this file runs WITHOUT jsdom — window/document are undefined.
// Any DOM access at import time, patch construction, or generateHTML() throws
// here, so a passing suite proves the adapter is server-safe by execution,
// not just by design.
import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { dragDrop, multiList, multiListGroup } from "../src/index";

describe("dnd SSR (DOM-less server render)", () => {
  it("runs in a genuinely DOM-less environment", () => {
    // Pin the environment claim the rest of the file relies on.
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders a dragDrop() list to markup without throwing", () => {
    const items = toState([
      { id: 1, label: "Alpha" },
      { id: 2, label: "Beta" },
      { id: 3, label: "Gamma" },
    ]);
    const App: DomphyElement = {
      ul: (l) => items.get(l).map((it) => ({ li: it.label, _key: it.id })),
      $: [dragDrop(items, { dragHandle: ".handle" })],
    };

    const node = new ElementNode(App);
    const html = node.generateHTML();

    expect(html).toMatch(/^<ul[ >]/);
    expect(html).toContain(">Alpha</li>");
    expect(html).toContain(">Beta</li>");
    expect(html).toContain(">Gamma</li>");
    expect(html).toMatch(/<\/ul>$/);
  });

  it("renders a multiList() pair to markup without throwing", () => {
    const todo = toState(["Write tests", "Review PR"]);
    const done = toState(["Deploy"]);
    const App: DomphyElement = {
      div: [
        {
          ul: (l) => todo.get(l).map((t) => ({ li: t, _key: t })),
          $: [multiList({ group: "tasks", values: todo })],
        },
        {
          ul: (l) => done.get(l).map((t) => ({ li: t, _key: t })),
          $: [multiList({ group: "tasks", values: done })],
        },
      ],
    };

    const html = new ElementNode(App).generateHTML();

    expect(html).toContain(">Write tests</li>");
    expect(html).toContain(">Deploy</li>");
  });

  it("renders a multiListGroup() tree to markup without throwing", () => {
    const listA = toState(["a1", "a2"]);
    const listB = toState(["b1"]);
    const [dropA, dropB] = multiListGroup("tasks", [listA, listB]);
    const App: DomphyElement = {
      div: [
        {
          ul: (l) => listA.get(l).map((t) => ({ li: t, _key: t })),
          $: [dropA],
        },
        {
          ul: (l) => listB.get(l).map((t) => ({ li: t, _key: t })),
          $: [dropB],
        },
      ],
    };

    const html = new ElementNode(App).generateHTML();

    expect(html).toContain(">a1</li>");
    expect(html).toContain(">b1</li>");
  });

  it("never attaches the behavior server-side (registration stays Mount-gated)", () => {
    // The FormKit registration lives in a behavior() instance that attaches
    // on the node's one-time Mount hook — which only fires client-side. In a
    // DOM-less render the attach must never run: if it did, attachDragDrop's
    // requestAnimationFrame call would throw (rAF is undefined in node).
    expect(typeof requestAnimationFrame).toBe("undefined");
    const items = toState(["x"]);
    const node = new ElementNode({
      ul: (l) => items.get(l).map((t) => ({ li: t, _key: t })),
      $: [dragDrop(items)],
    });
    expect(() => node.generateHTML()).not.toThrow();
    // generateCSS walks the same tree — also DOM-free.
    expect(() => node.generateCSS()).not.toThrow();
  });
});
