// @vitest-environment jsdom
// Adapter lifecycle: reactive ancestor re-render reuses DOM nodes with a
// fresh factory closure; form field bindings must keep updating, and
// destroy()/unmount must not throw or keep listeners alive.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { createForm } from "../src/domphy/index";

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

describe("createForm ElementNode lifecycle", () => {
  it("field value stays reactive across ancestor re-renders and cleans up on destroy", async () => {
    const tick = toState(0);
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
    });
    const name = form.field<string>("name");

    const app: DomphyElement = {
      div: (l) => {
        tick.get(l); // re-render dependency
        return [
          { p: (l2) => String(name.value(l2)), class: "val" },
          {
            button: "set",
            class: "set",
            onClick: () => name.handleChange("Grace"),
          },
        ];
      },
    };

    const { host, node } = render(app);

    expect(host.querySelector(".val")?.textContent).toBe("Ada");

    (host.querySelector(".set") as HTMLButtonElement).click();
    await flush();
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("Grace");

    // Ancestor re-render: fresh closure, same DOM node (the hard class).
    tick.set(tick.get() + 1);
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("Grace");

    name.handleChange("Lin");
    await flush();
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("Lin");

    // Destroy stops reactive notifications; further changes must not throw.
    let listenerCalls = 0;
    name.value(() => listenerCalls++);
    form.destroy();
    expect(() => name.handleChange("AfterDestroy")).not.toThrow();
    await flush();
    expect(listenerCalls).toBe(0);

    expect(() => node.remove()).not.toThrow();
  });

  it("survives multiple ancestor re-renders before first field write", async () => {
    const tick = toState(0);
    const form = createForm<{ name: string }>({
      defaultValues: { name: "Ada" },
    });
    const name = form.field<string>("name");

    const { host, node } = render({
      div: (l) => {
        tick.get(l);
        return [{ p: (l2) => String(name.value(l2)), class: "val" }];
      },
    });

    for (let i = 0; i < 3; i++) {
      tick.set(tick.get() + 1);
      flushSync();
    }
    expect(host.querySelector(".val")?.textContent).toBe("Ada");

    name.handleChange("Grace");
    await flush();
    flushSync();
    expect(host.querySelector(".val")?.textContent).toBe("Grace");

    form.destroy();
    node.remove();
  });
});
