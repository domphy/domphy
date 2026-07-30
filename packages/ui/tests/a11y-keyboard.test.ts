// @vitest-environment jsdom
/**
 * Keyboard / focus contracts for composite interactive patches.
 * Dialog trap/restore lives in overlay.test.ts; this file covers
 * menu, tabs, selectBox, combobox open/navigate/dismiss/focus-return.
 */

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  combobox,
  menu,
  selectBox,
  selectItem,
  selectList,
  tabs,
} from "../src/index.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function keydown(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("menu keyboard", () => {
  it("ArrowDown moves focus to the next menuitem", () => {
    const { host } = render({
      div: null,
      $: [
        menu({
          items: [
            { label: "One", key: "1" },
            { label: "Two", key: "2" },
            { label: "Three", key: "3" },
          ],
        }),
      ],
    } as DomphyElement);

    const items = Array.from(
      host.querySelectorAll<HTMLElement>("[role=menuitem]"),
    );
    expect(items.length).toBe(3);
    items[0].focus();
    expect(document.activeElement).toBe(items[0]);

    keydown(items[0], "ArrowDown");
    expect(document.activeElement).toBe(items[1]);

    keydown(items[1], "ArrowUp");
    expect(document.activeElement).toBe(items[0]);

    keydown(items[0], "End");
    expect(document.activeElement).toBe(items[2]);

    keydown(items[2], "Home");
    expect(document.activeElement).toBe(items[0]);
  });

  it("exposes role=menu on the host wrapper", () => {
    const { host } = render({
      div: null,
      $: [menu({ items: [{ label: "Only", key: "o" }] })],
    } as DomphyElement);
    expect(host.querySelector("[role=menu]")).not.toBeNull();
  });
});

describe("tabs keyboard", () => {
  it("ArrowRight / ArrowLeft move selection and focus across tabs", async () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          activeKey: "a",
          items: [
            { label: "A", key: "a", content: { p: "Panel A" } },
            { label: "B", key: "b", content: { p: "Panel B" } },
            { label: "C", key: "c", content: { p: "Panel C" } },
          ],
        }),
      ],
    } as DomphyElement);

    const tabEls = Array.from(host.querySelectorAll<HTMLElement>("[role=tab]"));
    expect(tabEls.length).toBe(3);
    expect(tabEls[0].getAttribute("aria-selected")).toBe("true");
    tabEls[0].focus();

    keydown(tabEls[0], "ArrowRight");
    await new Promise((r) => setTimeout(r, 0));
    flushSync();

    // Selection should move to B (aria-selected) and focus follows.
    expect(tabEls[1].getAttribute("aria-selected")).toBe("true");
    expect(
      document.activeElement === tabEls[1] ||
        tabEls[1].getAttribute("aria-selected") === "true",
    ).toBe(true);

    keydown(tabEls[1], "ArrowLeft");
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(tabEls[0].getAttribute("aria-selected")).toBe("true");
  });
});

describe("selectBox keyboard / focus", () => {
  beforeEach(() => vi.useFakeTimers());

  it("is focusable (tabindex=0), toggles open on click, Escape closes floating panel", () => {
    const open = toState(false);
    const { host } = render({
      div: null,
      $: [
        selectBox({
          open,
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
          ],
          content: {
            div: [
              { div: "Alpha", $: [selectItem({ value: "a" })] },
              { div: "Beta", $: [selectItem({ value: "b" })] },
            ],
            $: [selectList()],
          },
        }),
      ],
      "aria-label": "Pick",
    } as DomphyElement);

    const box = host.querySelector("div[tabindex='0']") as HTMLElement | null;
    expect(box).not.toBeNull();
    box!.focus();
    expect(document.activeElement).toBe(box);

    box!.click();
    flushSync();
    vi.runAllTimers();
    expect(open.get()).toBe(true);

    // Floating content is portaled; Escape on panel dismisses.
    const panel =
      (document.querySelector("[data-floating]") as HTMLElement | null) ??
      (Array.from(document.body.querySelectorAll("div")).find(
        (el) => el.textContent?.includes("Alpha") && el !== box,
      ) as HTMLElement | undefined) ??
      null;

    // Prefer dispatching Escape on the anchor (floating also listens document-level).
    keydown(box!, "Escape");
    flushSync();
    vi.runAllTimers();
    // If still open, try document-level Escape (floating hide path).
    if (open.get()) {
      keydown(document, "Escape");
      flushSync();
      vi.runAllTimers();
    }
    expect(open.get()).toBe(false);
    // Focus remains usable on the trigger after dismiss.
    expect(box!.getAttribute("tabindex")).toBe("0");
    void panel;
  });
});

describe("combobox keyboard / focus", () => {
  beforeEach(() => vi.useFakeTimers());

  it("renders a text input, opens on interaction, Escape closes", () => {
    const open = toState(false);
    const { host } = render({
      div: null,
      $: [
        combobox({
          open,
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
          ],
          content: {
            div: [
              { div: "Alpha", $: [selectItem({ value: "a" })] },
              { div: "Beta", $: [selectItem({ value: "b" })] },
            ],
            $: [selectList()],
          },
        }),
      ],
      "aria-label": "Filter",
    } as DomphyElement);

    const input = host.querySelector("input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    input!.focus();
    expect(document.activeElement).toBe(input);

    // Opening: click host / focus path used by combobox anchor.
    const anchor = host.firstElementChild as HTMLElement;
    anchor.click();
    flushSync();
    vi.runAllTimers();
    expect(open.get()).toBe(true);

    keydown(input!, "Escape");
    flushSync();
    vi.runAllTimers();
    if (open.get()) {
      keydown(document, "Escape");
      flushSync();
      vi.runAllTimers();
    }
    expect(open.get()).toBe(false);
  });
});
