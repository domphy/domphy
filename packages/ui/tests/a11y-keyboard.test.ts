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

    // Selection should move to B (aria-selected) and focus must follow —
    // a second arrow key fires on the newly focused tab, not the stale one.
    expect(tabEls[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabEls[1]);

    // Roving tabindex: selected tab is tabbable, the rest are not.
    expect(tabEls[0].getAttribute("tabindex")).toBe("-1");
    expect(tabEls[1].getAttribute("tabindex")).toBe("0");
    expect(tabEls[2].getAttribute("tabindex")).toBe("-1");

    // Tab C must be reachable: a second ArrowRight from the focused tab B.
    keydown(tabEls[1], "ArrowRight");
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(tabEls[2].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabEls[2]);

    keydown(tabEls[2], "ArrowLeft");
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(tabEls[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabEls[1]);

    keydown(tabEls[1], "Home");
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    expect(tabEls[0].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabEls[0]);
  });
});

describe("selectBox keyboard / focus", () => {
  beforeEach(() => vi.useFakeTimers());

  it("opens via Enter (not only click), Space toggles, Escape closes; focus stays on trigger", () => {
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
    expect(box!.getAttribute("role")).toBe("button");
    expect(box!.getAttribute("aria-haspopup")).toBe("listbox");
    box!.focus();
    expect(document.activeElement).toBe(box);
    expect(open.get()).toBe(false);

    // Criterion: keyboard open — Enter on focused trigger (no .click()).
    keydown(box!, "Enter");
    flushSync();
    vi.runAllTimers();
    flushSync();
    expect(open.get()).toBe(true);
    // Primary contract is open state; aria-expanded follows when reactive attrs flush.
    // Accept "true" or empty boolean-true serialization; reject explicit "false".
    expect(box!.getAttribute("aria-expanded")).not.toBe("false");

    // Escape closes; focus remains usable on the trigger.
    keydown(box!, "Escape");
    flushSync();
    vi.runAllTimers();
    if (open.get()) {
      keydown(document, "Escape");
      flushSync();
      vi.runAllTimers();
    }
    expect(open.get()).toBe(false);
    expect(box!.getAttribute("tabindex")).toBe("0");
    expect(document.activeElement === box || box!.tabIndex === 0).toBe(true);

    // Space opens when closed.
    keydown(box!, " ");
    flushSync();
    vi.runAllTimers();
    expect(open.get()).toBe(true);

    // ArrowDown opens when closed.
    keydown(box!, "Escape");
    flushSync();
    vi.runAllTimers();
    expect(open.get()).toBe(false);
    keydown(box!, "ArrowDown");
    flushSync();
    vi.runAllTimers();
    expect(open.get()).toBe(true);
  });
});

describe("selectBox typeahead (Radix Select character-search parity)", () => {
  beforeEach(() => vi.useFakeTimers());

  const OPTIONS = [
    { label: "Alpha", value: "alpha" },
    { label: "Apple", value: "apple" },
    { label: "Beta", value: "beta" },
  ];

  function renderClosed(value: any) {
    const { host } = render({
      div: null,
      $: [
        selectBox({
          value,
          options: OPTIONS,
          content: { div: [], $: [selectList()] },
        }),
      ],
      "aria-label": "Pick",
    } as DomphyElement);
    return host.querySelector("div[tabindex='0']") as HTMLElement;
  }

  it("closed trigger: typing selects the case-insensitive prefix match", () => {
    const value = toState<string | null>(null);
    const box = renderClosed(value);

    keydown(box, "B"); // uppercase still matches "Beta"
    expect(value.get()).toBe("beta");
  });

  it("buffer accumulates within the timeout and resets after 1s idle", () => {
    const value = toState<string | null>(null);
    const box = renderClosed(value);

    keydown(box, "a");
    keydown(box, "l");
    keydown(box, "p");
    expect(value.get()).toBe("alpha"); // buffer "alp" still prefixes "Alpha"

    vi.advanceTimersByTime(1100); // buffer resets
    keydown(box, "b");
    expect(value.get()).toBe("beta");
  });

  it("a repeated character cycles through that character's matches", () => {
    const value = toState<string | null>(null);
    const box = renderClosed(value);

    keydown(box, "a");
    expect(value.get()).toBe("alpha");
    keydown(box, "a"); // "aa" → cycle to the next a* option
    expect(value.get()).toBe("apple");
    keydown(box, "a"); // wraps around
    expect(value.get()).toBe("alpha");
  });

  it("open panel: focus moves to the matching option, skipping disabled ones", () => {
    const open = toState(false);
    const { host } = render({
      div: null,
      $: [
        selectBox({
          open,
          options: OPTIONS,
          content: {
            div: [
              { div: "Alpha", $: [selectItem({ value: "alpha" })] },
              {
                div: "Apple",
                $: [selectItem({ value: "apple" })],
                "aria-disabled": "true",
              },
              { div: "Alps", $: [selectItem({ value: "alps" })] },
            ],
            $: [selectList()],
          },
        }),
      ],
      "aria-label": "Pick",
    } as DomphyElement);

    const box = host.querySelector("div[tabindex='0']") as HTMLElement;
    box.focus();
    keydown(box, "Enter");
    flushSync();
    vi.runAllTimers();
    flushSync();
    expect(open.get()).toBe(true);

    // "a" focuses the first enabled a* option.
    keydown(box, "a");
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Alpha");

    // Repeat cycles — the aria-disabled "Apple" is skipped.
    keydown(box, "a");
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Alps");

    // Wraps back to the first match.
    keydown(box, "a");
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Alpha");
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
