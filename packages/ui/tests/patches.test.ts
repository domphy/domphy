// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dialog } from "../src/index.ts";
import { _resetScrollLock } from "../src/utils/scrollLock.ts";

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
  _resetScrollLock();
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

describe("dialog transitionend bubble guard", () => {
  it("ignores a transitionend bubbled from nested content while closing, but finalizes on its own", () => {
    const open = toState(true, "dlgOpenGuard");
    const App = {
      div: [{ dialog: [{ span: "nested" }], $: [dialog({ open })] }],
    } as DomphyElement;
    const { host, node } = render(App);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    const nested = host.querySelector("span")!;

    open.set(false); // starts closing: opacity -> 0, closing = true
    flushSync();

    // A transitionend bubbling up from nested content (e.g. an accordion/
    // details transition inside the dialog) must not finalize the close.
    const bubbled = new Event("transitionend", { bubbles: true }) as any;
    bubbled.propertyName = "opacity";
    nested.dispatchEvent(bubbled);
    expect(dlg.open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    // The dialog's own opacity transitionend still finalizes the close.
    const own = new Event("transitionend") as any;
    own.propertyName = "opacity";
    dlg.dispatchEvent(own);
    expect(dlg.open).toBe(false);
    expect(document.body.style.overflow).toBe("");

    node.remove();
  });
});
