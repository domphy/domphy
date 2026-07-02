// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it, vi } from "vitest";
import { multiList } from "../src/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// multiList()'s _onMount defers dragAndDrop() registration by a double rAF,
// same as dragDrop.ts — see multiList.ts for why.
const waitFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { node, host };
}

describe("multiList", () => {
  it("does not warn on mount with a non-empty initial list", async () => {
    // Regression: multiList() used to call dragAndDrop() synchronously in
    // _onMount, before Domphy appended the <li> children. FormKit's
    // remapNodes() then saw 0 DOM children vs a non-empty values array and
    // logged a spurious console.warn on every mount.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const todo = toState(["Write tests", "Review PR"]);
    const done = toState<string[]>([]);

    const { host, node } = mount({
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
    } as DomphyElement);

    await waitFrame();
    await waitFrame();
    await flush();

    const lists = host.querySelectorAll("ul");
    expect(lists[0]?.querySelectorAll("li").length).toBe(2);
    expect(lists[1]?.querySelectorAll("li").length).toBe(0);
    expect(warn).not.toHaveBeenCalled();

    node.remove();
    warn.mockRestore();
  });
});
