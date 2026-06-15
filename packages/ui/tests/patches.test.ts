// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dialog, menuItem, tab, toggle } from "../src/index.ts";

function render(App: DomphyElement) {
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

beforeEach(() => {
  // jsdom does not implement modal dialog behavior — stub the minimum the patch uses.
  (HTMLDialogElement.prototype as any).showModal = function () {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function () {
    this.open = false;
  };
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("dialog cleanup on removal", () => {
  it("restores page scroll and releases the open-state listener when removed while open", () => {
    const open = toState(true, "dlgOpen");
    const App = {
      div: [{ dialog: [{ p: "content" }], $: [dialog({ open })] }],
    } as DomphyElement;

    const { node } = render(App);
    expect(document.body.style.overflow).toBe("hidden"); // opened -> scroll locked
    expect(listenerCount(open)).toBeGreaterThanOrEqual(1);

    node.remove();
    expect(document.body.style.overflow).toBe(""); // restored on removal
    expect(listenerCount(open)).toBe(0); // listener released, no leak
  });
});

describe("provider-context patches degrade gracefully without a provider", () => {
  it("warn instead of throwing when used outside their provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Wrap in a parent so the patch's _onInsert fires (render() does not fire
    // Insert on the root node — only children get inserted).
    expect(() =>
      render({ div: [{ button: "Item", $: [menuItem()] }] } as DomphyElement),
    ).not.toThrow();
    expect(() =>
      render({ div: [{ button: "Tab", $: [tab()] }] } as DomphyElement),
    ).not.toThrow();
    expect(() =>
      render({ div: [{ button: "Toggle", $: [toggle()] }] } as DomphyElement),
    ).not.toThrow();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
