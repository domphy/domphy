// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { describe, expect, it, vi } from "vitest";
import { multiList, parents, setParentValues } from "../src/index";

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

describe("multiList cross-list transfer", () => {
  it("moves an item between two lists in the same group, updating both States", async () => {
    const todo = toState(["Write tests", "Review PR"]);
    const done = toState<string[]>(["Deploy"]);

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

    const [todoList, doneList] = Array.from(
      host.querySelectorAll("ul"),
    ) as HTMLUListElement[];
    const todoData = parents.get(todoList);
    const doneData = parents.get(doneList);

    // Both parents registered under the shared group.
    expect(todoData?.config.group).toBe("tasks");
    expect(doneData?.config.group).toBe("tasks");

    // Simulate FormKit driving a transfer of "Write tests" from todo to done:
    // the engine sets the shrunk source values and the grown target values
    // through exactly the setValues wires the adapter installed.
    setParentValues(todoList, todoData as never, ["Review PR"]);
    setParentValues(doneList, doneData as never, ["Deploy", "Write tests"]);

    expect(todo.get()).toEqual(["Review PR"]);
    expect(done.get()).toEqual(["Deploy", "Write tests"]);

    // And both keyed lists re-render to match (re-render is batched).
    await flush();
    expect(
      Array.from(todoList.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["Review PR"]);
    expect(
      Array.from(doneList.querySelectorAll("li")).map((li) => li.textContent),
    ).toEqual(["Deploy", "Write tests"]);

    node.remove();
  });
});
