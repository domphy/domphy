// @vitest-environment jsdom
/**
 * Keyboard models taken from the WAI-ARIA Authoring Practices Guide (APG).
 * Each test names the pattern whose published key table it encodes; the
 * expected behaviour comes from that spec, not from this implementation.
 *
 *  - Listbox:   https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *  - Radio group: https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 *  - Combobox:  https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 *  - Select-Only Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 */

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combobox,
  rating,
  segmented,
  selectBox,
  selectItem,
  selectList,
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

function keydown(target: EventTarget, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("APG Listbox keyboard model — selectList", () => {
  function renderList() {
    const { host } = render({
      div: [
        { div: "Apple", $: [selectItem({ value: "apple" })] },
        { div: "Banana", $: [selectItem({ value: "banana" })] },
        { div: "Cherry", $: [selectItem({ value: "cherry" })] },
      ],
      $: [selectList()],
    } as DomphyElement);
    flushSync();
    const listbox = host.querySelector("[role=listbox]") as HTMLElement;
    const options = Array.from(
      host.querySelectorAll("[role=option]"),
    ) as HTMLElement[];
    return { listbox, options };
  }

  // APG: "the listbox has tabindex=0 ... focus is set on the listbox or on an
  // option". Without a tab stop the widget is unreachable by keyboard.
  it("the listbox itself is in the tab order", () => {
    const { listbox } = renderList();
    expect(listbox.getAttribute("tabindex")).toBe("0");
  });

  // APG Listbox: "Down Arrow: Moves focus to the next option."
  it("ArrowDown/ArrowUp move focus between options", () => {
    const { listbox, options } = renderList();
    listbox.focus();
    keydown(listbox, "ArrowDown");
    expect(document.activeElement).toBe(options[0]);
    keydown(options[0]!, "ArrowDown");
    expect(document.activeElement).toBe(options[1]);
    keydown(options[1]!, "ArrowUp");
    expect(document.activeElement).toBe(options[0]);
  });

  // APG Listbox: "Home: Moves focus to first option. End: ... last option."
  it("Home/End jump to the first and last option", () => {
    const { listbox, options } = renderList();
    listbox.focus();
    keydown(listbox, "End");
    expect(document.activeElement).toBe(options[2]);
    keydown(options[2]!, "Home");
    expect(document.activeElement).toBe(options[0]);
  });

  // APG Listbox (single-select): "Enter or Space: selects the focused option."
  it("Enter selects the focused option", () => {
    const { listbox, options } = renderList();
    listbox.focus();
    keydown(listbox, "ArrowDown");
    keydown(options[0]!, "ArrowDown");
    keydown(options[1]!, "Enter");
    flushSync();
    expect(options[1]!.getAttribute("aria-selected")).toBe("true");
  });

  // APG: a handled navigation key must not also scroll the page.
  it("calls preventDefault on handled navigation keys", () => {
    const { listbox } = renderList();
    listbox.focus();
    expect(keydown(listbox, "ArrowDown").defaultPrevented).toBe(true);
    expect(keydown(listbox, "Tab").defaultPrevented).toBe(false);
  });
});

describe("APG Radio Group keyboard model — segmented", () => {
  function renderSegmented() {
    const { host } = render({
      div: null,
      $: [
        segmented({
          items: [
            { label: "Day", key: "day" },
            { label: "Month", key: "month" },
            { label: "Year", key: "year" },
          ],
        }),
      ],
    } as DomphyElement);
    flushSync();
    return Array.from(host.querySelectorAll("[role=radio]")) as HTMLElement[];
  }

  // APG Radio Group: "Right Arrow / Down Arrow: moves focus to and checks the
  // next radio button" — BOTH axes, not just the horizontal one.
  it("ArrowDown behaves like ArrowRight and ArrowUp like ArrowLeft", () => {
    const radios = renderSegmented();
    radios[0]!.focus();
    keydown(radios[0]!, "ArrowDown");
    flushSync();
    expect(radios[1]!.getAttribute("aria-checked")).toBe("true");
    keydown(radios[1]!, "ArrowUp");
    flushSync();
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
  });
});

describe("APG Radio Group keyboard model — rating", () => {
  // APG Radio Group exposes the checked member via aria-checked; MUI Rating
  // and Ark UI's rating-group both use radiogroup semantics for this reason.
  it("exposes the chosen star through aria-checked on radios", () => {
    const { host } = render({
      div: null,
      $: [rating({ value: 2 })],
    } as DomphyElement);
    flushSync();
    const group = host.querySelector("[role=radiogroup]");
    expect(group).not.toBeNull();
    const radios = Array.from(
      host.querySelectorAll("[role=radio]"),
    ) as HTMLElement[];
    expect(radios.map((el) => el.getAttribute("aria-checked"))).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
    ]);
  });

  // APG Radio Group: "End: moves focus to and checks the last radio button."
  it("End selects the maximum rating, Home the first", () => {
    const { host } = render({
      div: null,
      $: [rating({ value: 2 })],
    } as DomphyElement);
    flushSync();
    const radios = Array.from(
      host.querySelectorAll("[role=radio]"),
    ) as HTMLElement[];
    keydown(radios[1]!, "End");
    flushSync();
    expect(radios[4]!.getAttribute("aria-checked")).toBe("true");
    keydown(radios[4]!, "Home");
    flushSync();
    expect(radios[0]!.getAttribute("aria-checked")).toBe("true");
  });
});

// The selectBox/combobox ArrowDown-into-panel path chains a 100ms show()
// debounce, an imperative panel mount (createFloating's rootNode.children.insert),
// and an extra requestAnimationFrame before the panel's `visibility` style
// lands (see selectBox.ts's openThenMove comment) — three async hops that
// were previously verified only by hand in real Chromium. Real timers (not
// `vi.useFakeTimers()`, which does not fake requestAnimationFrame in this
// project — see overlay-layering.test.ts's "dialog initial focus") let both
// hops actually run; `settle()` awaits the debounce then one real frame.
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

describe("APG Select-Only Combobox keyboard model — selectBox", () => {
  function renderSelectBox() {
    const open = toState(false);
    const { host } = render({
      div: null,
      $: [
        selectBox({
          open,
          options: [
            { label: "Alpha", value: "a" },
            { label: "Beta", value: "b" },
            { label: "Gamma", value: "c" },
          ],
          content: {
            div: [
              { div: "Alpha", $: [selectItem({ value: "a" })] },
              {
                div: "Beta",
                $: [selectItem({ value: "b" })],
                "aria-disabled": "true",
              },
              { div: "Gamma", $: [selectItem({ value: "c" })] },
            ],
            $: [selectList()],
          },
        }),
      ],
      "aria-label": "Pick",
    } as DomphyElement);
    const trigger = host.querySelector("div[tabindex='0']") as HTMLElement;
    return { host, trigger, open };
  }

  // APG "Select-Only Combobox": "Down Arrow ... moves focus into the listbox
  // ... if the combobox is not already displaying the listbox, it makes the
  // listbox visible and moves visual focus to the first option."
  it("ArrowDown on the closed trigger opens the panel and moves focus to the first ENABLED option", async () => {
    const { trigger, open } = renderSelectBox();
    keydown(trigger, "ArrowDown");
    await settle();
    flushSync();
    expect(open.get()).toBe(true);
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Alpha");
  });

  // Same example: "if the combobox is not already displaying the listbox ...
  // Up Arrow: ... moves visual focus to the last option." Beta is disabled,
  // so the first ENABLED option reached from the end is Gamma.
  it("ArrowUp/End on the closed trigger open the panel and move focus to the last enabled option", async () => {
    const { trigger: upTrigger, open: upOpen } = renderSelectBox();
    keydown(upTrigger, "ArrowUp");
    await settle();
    flushSync();
    expect(upOpen.get()).toBe(true);
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Gamma");

    const { trigger: endTrigger, open: endOpen } = renderSelectBox();
    keydown(endTrigger, "End");
    await settle();
    flushSync();
    expect(endOpen.get()).toBe(true);
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Gamma");
  });

  // Once open, ArrowDown/Home move within the panel via the same
  // moveIntoPanel() call, skipping the show() debounce entirely.
  it("ArrowDown while already open moves focus without re-debouncing", async () => {
    const { trigger, open } = renderSelectBox();
    keydown(trigger, "ArrowDown");
    await settle();
    flushSync();
    expect(open.get()).toBe(true);
    const first = document.activeElement as HTMLElement;
    expect(first.textContent).toBe("Alpha");

    keydown(first, "End");
    // No wait: an already-open panel's moveIntoPanel runs synchronously.
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Gamma");
  });
});

describe("APG Combobox with List Autocomplete keyboard model — combobox", () => {
  function renderCombobox() {
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
    const input = host.querySelector("input") as HTMLInputElement;
    return { host, input, open };
  }

  // APG Combobox with List Autocomplete: "Down Arrow: ... If the popup is
  // not visible, opens the popup and moves visual focus to the first
  // option."
  it("ArrowDown on the closed input opens the popup and moves focus to the first option", async () => {
    const { input, open } = renderCombobox();
    input.focus();
    keydown(input, "ArrowDown");
    await settle();
    flushSync();
    expect(open.get()).toBe(true);
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Alpha");
  });

  it("ArrowUp on the closed input opens the popup and moves focus to the last option", async () => {
    const { input, open } = renderCombobox();
    input.focus();
    keydown(input, "ArrowUp");
    await settle();
    flushSync();
    expect(open.get()).toBe(true);
    expect((document.activeElement as HTMLElement)?.textContent).toBe("Beta");
  });
});
