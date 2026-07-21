// @vitest-environment jsdom
// Adapter lifecycle: reactive ancestor re-render reuses DOM nodes with a
// fresh factory closure; table row-model bindings must keep updating, and
// destroy() must stop version listener bumps.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { createDomphyTable } from "../src/domphy/index";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
} from "../src/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = "";
});

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

type Person = { id: number; name: string; age: number };

const people: Person[] = [
  { id: 1, name: "Carol", age: 28 },
  { id: 2, name: "Alice", age: 45 },
  { id: 3, name: "Bob", age: 32 },
];

const helper = createColumnHelper<Person>();
const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
];

describe("createDomphyTable ElementNode lifecycle", () => {
  it("row model stays reactive across ancestor re-renders; destroy stops bumps", async () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    const tick = toState(0);
    const app: DomphyElement = {
      div: (l) => {
        tick.get(l); // re-render dependency
        const rows = dTable.getRowModel(l).rows;
        return [
          {
            p: String(rows.length),
            class: "count",
          },
          {
            p: rows.map((row) => row.original.name).join(","),
            class: "names",
          },
          {
            button: "sort",
            class: "sort",
            onClick: () => {
              dTable.table.getColumn("name")?.toggleSorting(false);
            },
          },
        ];
      },
    };

    const { host, node } = render(app);

    expect(host.querySelector(".count")?.textContent).toBe("3");
    expect(host.querySelector(".names")?.textContent).toBe("Carol,Alice,Bob");

    // Ancestor re-render: fresh closure, same DOM node.
    tick.set(tick.get() + 1);
    flushSync();
    expect(host.querySelector(".count")?.textContent).toBe("3");
    expect(host.querySelector(".names")?.textContent).toBe("Carol,Alice,Bob");

    // Sort after parent re-render still works.
    (host.querySelector(".sort") as HTMLButtonElement).click();
    await flush();
    flushSync();
    expect(host.querySelector(".names")?.textContent).toBe("Alice,Bob,Carol");

    // Another re-render then sort desc.
    tick.set(tick.get() + 1);
    flushSync();
    dTable.table.getColumn("name")?.toggleSorting(true);
    await flush();
    flushSync();
    expect(host.querySelector(".names")?.textContent).toBe("Carol,Bob,Alice");

    // destroy() then no listener bumps.
    let bumps = 0;
    dTable.version(() => bumps++);
    dTable.destroy();
    dTable.table.getColumn("age")?.toggleSorting(false);
    await flush();
    expect(bumps).toBe(0);

    expect(() => node.remove()).not.toThrow();
  });

  it("survives multiple ancestor re-renders before first interaction", async () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
    });

    const tick = toState(0);
    const { host, node } = render({
      div: (l) => {
        tick.get(l);
        return [
          {
            p: String(dTable.getRowModel(l).rows.length),
            class: "count",
          },
        ];
      },
    });

    for (let i = 0; i < 3; i++) {
      tick.set(tick.get() + 1);
      flushSync();
    }
    expect(host.querySelector(".count")?.textContent).toBe("3");

    dTable.table.getColumn("name")?.toggleSorting(false);
    await flush();
    flushSync();
    // Row count unchanged by sort; binding still live.
    expect(host.querySelector(".count")?.textContent).toBe("3");
    expect(dTable.getRowModel().rows[0].original.name).toBe("Alice");

    dTable.destroy();
    node.remove();
  });
});
