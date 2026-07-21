// @vitest-environment jsdom
// Adapter lifecycle: reactive ancestor re-render reuses DOM nodes with a
// fresh factory closure; query data bindings must keep updating, and
// destroy() must stop notifications.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createQuery } from "../src/domphy/index";
import { QueryClient } from "../src/index";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
  client.mount();
});

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

describe("createQuery ElementNode lifecycle", () => {
  it("data stays reactive across ancestor re-renders; destroy stops updates", async () => {
    let value = 1;
    const query = createQuery<number>(client, {
      queryKey: ["lifecycle"],
      queryFn: async () => value,
    });

    await sleep(20);
    expect(query.data()).toBe(1);

    const tick = toState(0);
    const app: DomphyElement = {
      div: (l) => {
        tick.get(l); // re-render dependency
        return [
          {
            p: (l2) => String(query.data(l2) ?? "pending"),
            class: "val",
          },
          {
            button: "refetch",
            class: "refetch",
            onClick: () => {
              void query.refetch();
            },
          },
        ];
      },
    };

    const { host, node } = render(app);
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("1");

    // Ancestor re-render: fresh closure, same DOM node.
    tick.set(tick.get() + 1);
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("1");

    value = 2;
    await query.refetch();
    await sleep(20);
    flushSync();
    expect(query.data()).toBe(2);
    expect(host.querySelector(".val")?.textContent).toBe("2");

    // setOptions still works after re-render.
    query.setOptions({
      queryKey: ["lifecycle-b"],
      queryFn: async () => 99,
    });
    await sleep(20);
    flushSync();
    expect(query.data()).toBe(99);
    expect(host.querySelector(".val")?.textContent).toBe("99");

    // Destroy stops further listener notifications.
    let dataCalls = 0;
    query.data(() => dataCalls++);
    query.destroy();

    await client.refetchQueries({ queryKey: ["lifecycle-b"] });
    await sleep(20);
    expect(dataCalls).toBe(0);

    expect(() => node.remove()).not.toThrow();
  });

  it("survives multiple ancestor re-renders before first data paint settles", async () => {
    const query = createQuery<string>(client, {
      queryKey: ["lifecycle-multi"],
      queryFn: async () => {
        await sleep(5);
        return "ok";
      },
    });

    const tick = toState(0);
    const { host, node } = render({
      div: (l) => {
        tick.get(l);
        return [
          {
            p: (l2) => String(query.data(l2) ?? query.status(l2)),
            class: "val",
          },
        ];
      },
    });

    for (let i = 0; i < 3; i++) {
      tick.set(tick.get() + 1);
      flushSync();
    }

    await sleep(30);
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("ok");

    query.destroy();
    node.remove();
  });
});
