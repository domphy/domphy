// @vitest-environment jsdom
// Real-browser coverage (Tab/Space/Arrow/Escape, focus/blur/scrollIntoView)
// lives in ../e2e/keyboardSort.spec.ts (Playwright, `pnpm test:e2e`) — jsdom
// has no layout engine and cannot exercise those.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { keyboardSort, keyboardSortGroup } from "../src/index";

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(App).render(host);
  return host;
}

// Reactivity flushes on a microtask, so drain it before reading the DOM the
// key press re-rendered.
function press(element: Element, key: string): void {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
  flushSync();
}

function liveText(): string {
  const region = document.querySelector('[aria-live="assertive"]');
  return region?.textContent ?? "";
}

type Item = { id: number; label: string };

function items(): Item[] {
  return [
    { id: 1, label: "A" },
    { id: 2, label: "B" },
    { id: 3, label: "C" },
  ];
}

describe("keyboardSort", () => {
  // WCAG 2.1 SC 2.1.1 (Keyboard): the reorder control must be reachable and
  // operable from the keyboard, and WAI-ARIA requires the instructions it is
  // described by to exist in the accessibility tree.
  it("makes items focusable and describes the key contract (WCAG 2.1.1)", () => {
    const list = toState(items());
    const sortItem = keyboardSort(list);
    const host = mount({
      ul: (listener) =>
        list.get(listener).map((item, index) => ({
          li: item.label,
          _key: item.id,
          $: [sortItem(index)],
        })),
    } as DomphyElement);

    const first = host.querySelector("li") as HTMLElement;
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(first.getAttribute("aria-roledescription")).toBe("sortable item");

    const describedBy = first.getAttribute("aria-describedby") as string;
    const instructions = document.getElementById(describedBy);
    expect(instructions?.textContent).toContain("arrow keys");
  });

  // WCAG 2.2 SC 2.5.7 (Dragging Movements, AA): everything the pointer drag
  // does must be achievable without a dragging movement. The interaction model
  // (space to pick up, arrows to move, space to drop) is the one dnd-kit's
  // KeyboardSensor and react-beautiful-dnd implement.
  it("reorders the bound State with space + arrow keys, no pointer (WCAG 2.5.7)", () => {
    const list = toState(items());
    const sortItem = keyboardSort(list);
    const host = mount({
      ul: (listener) =>
        list.get(listener).map((item, index) => ({
          li: item.label,
          _key: item.id,
          $: [sortItem(index)],
        })),
    } as DomphyElement);

    const first = host.querySelector("li") as HTMLElement;
    press(first, " ");
    expect(first.getAttribute("data-grabbed")).toBe("true");
    expect(liveText()).toContain("A grabbed");

    press(first, "ArrowDown");
    expect(list.get().map((item) => item.label)).toEqual(["B", "A", "C"]);

    press(first, "End");
    expect(list.get().map((item) => item.label)).toEqual(["B", "C", "A"]);

    press(first, " ");
    expect(first.getAttribute("data-grabbed")).toBeNull();
    expect(liveText()).toContain("dropped at position 3 of 3");
  });

  // react-beautiful-dnd and dnd-kit both restore the pre-drag order on Escape.
  it("Escape cancels the move and restores the original order", () => {
    const list = toState(items());
    const sortItem = keyboardSort(list);
    const host = mount({
      ul: (listener) =>
        list.get(listener).map((item, index) => ({
          li: item.label,
          _key: item.id,
          $: [sortItem(index)],
        })),
    } as DomphyElement);

    const first = host.querySelector("li") as HTMLElement;
    press(first, " ");
    press(first, "ArrowDown");
    press(first, "ArrowDown");
    expect(list.get().map((item) => item.label)).toEqual(["B", "C", "A"]);

    press(first, "Escape");
    expect(list.get().map((item) => item.label)).toEqual(["A", "B", "C"]);
    expect(liveText()).toContain("Move cancelled");
    expect(document.querySelector('[data-grabbed="true"]')).toBeNull();
  });

  // Cross-list keyboard moves ride the horizontal axis in react-beautiful-dnd:
  // left/right move the grabbed item to the neighbouring list.
  it("ArrowRight moves the grabbed item to the next list (rbd cross-list model)", () => {
    const left = toState<Item[]>([{ id: 1, label: "L1" }]);
    const right = toState<Item[]>([{ id: 2, label: "R1" }]);
    const [sortLeft, sortRight] = keyboardSortGroup([left, right]);

    const host = mount({
      div: [
        {
          ul: (listener) =>
            left.get(listener).map((item, index) => ({
              li: item.label,
              _key: item.id,
              $: [(sortLeft as (index: number) => object)(index)],
            })),
          id: "left",
        },
        {
          ul: (listener) =>
            right.get(listener).map((item, index) => ({
              li: item.label,
              _key: item.id,
              $: [(sortRight as (index: number) => object)(index)],
            })),
          id: "right",
        },
      ],
    } as DomphyElement);

    const source = host.querySelector("#left li") as HTMLElement;
    press(source, " ");
    press(source, "ArrowRight");

    expect(left.get()).toEqual([]);
    expect(right.get().map((item) => item.label)).toEqual(["L1", "R1"]);
    expect(liveText()).toContain("list 2");

    // Escape unwinds a cross-list move too.
    const moved = document.querySelector(
      '[data-grabbed="true"]',
    ) as HTMLElement;
    press(moved, "Escape");
    expect(left.get().map((item) => item.label)).toEqual(["L1"]);
    expect(right.get().map((item) => item.label)).toEqual(["R1"]);
  });

  // WAI-ARIA APG: Escape is the dialog pattern's close key, and arrows drive
  // an enclosing composite widget. While an item is held those keys belong to
  // the move, so react-beautiful-dnd stops them from reaching an ancestor —
  // otherwise cancelling a move also closes the dialog the list sits in.
  it("keeps a held item's keys from reaching an ancestor handler (APG dialog/composite)", () => {
    const list = toState(items());
    const sortItem = keyboardSort(list);
    const seen: string[] = [];
    const host = mount({
      div: {
        ul: (listener) =>
          list.get(listener).map((item, index) => ({
            li: item.label,
            _key: item.id,
            $: [sortItem(index)],
          })),
      },
      onKeyDown: (event: KeyboardEvent) => seen.push(event.key),
    } as DomphyElement);

    const first = host.querySelector("li") as HTMLElement;
    press(first, "Escape"); // not held yet — the ancestor still sees it
    expect(seen).toEqual(["Escape"]);

    press(first, " ");
    press(first, "ArrowDown");
    press(first, "Escape");
    expect(seen).toEqual(["Escape"]);
    expect(list.get().map((item) => item.label)).toEqual(["A", "B", "C"]);
  });

  // The engine's own pointer path writes the same State, so a keyboard reorder
  // must be a plain State write with no DOM/engine coupling — it has to work
  // before the pointer engine registers, and on a list with no dragDrop() at
  // all.
  it("works without the pointer engine registered", () => {
    const list = toState(items());
    const sortItem = keyboardSort(list);
    const host = mount({
      ul: (listener) =>
        list.get(listener).map((item, index) => ({
          li: item.label,
          _key: item.id,
          $: [sortItem(index)],
        })),
    } as DomphyElement);

    const first = host.querySelector("li") as HTMLElement;
    press(first, "Enter");
    press(first, "ArrowDown");
    press(first, "Enter");
    expect(list.get().map((item) => item.label)).toEqual(["B", "A", "C"]);
  });
});
