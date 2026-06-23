// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  combobox,
  command,
  commandItem,
  commandSearch,
  selectBox,
  selectItem,
  selectList,
} from "../src/index.ts";

// @domphy/floating (combobox/selectBox) observes layout via ResizeObserver.
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

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// selectList (+ numeric 0 bug fix)
// ---------------------------------------------------------------------------

describe("selectList", () => {
  it("warns when applied to a non-div element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ span: "x", $: [selectList()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("selectList"));
  });

  it("exposes a select context that child selectItems read", () => {
    const { host } = render({
      div: [
        {
          div: [{ div: "A", $: [selectItem({ value: "a" })] }],
          $: [selectList({ value: "a" })],
        },
      ],
    } as DomphyElement);
    const option = host.querySelector("[role=option]");
    expect(option?.getAttribute("aria-selected")).toBe("true");
  });

  it("renders a hidden input carrying the selected value", () => {
    const { host } = render({
      div: [
        {
          div: [{ div: "A", $: [selectItem({ value: "a" })] }],
          $: [selectList({ value: "a", name: "pick" })],
        },
      ],
    } as DomphyElement);
    const input = host.querySelector(
      "input[name=pick]",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe("a");
  });

  it("preserves a legitimate numeric 0 value in the hidden input", () => {
    const { host } = render({
      div: [
        {
          div: [{ div: "Zero", $: [selectItem({ value: 0 })] }],
          $: [selectList({ value: 0, name: "n" })],
        },
      ],
    } as DomphyElement);
    const input = host.querySelector(
      "input[name=n]",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    // The bug was `v || ""` which turned 0 into "". The fix keeps "0".
    expect(input!.value).toBe("0");
  });

  it("renders an empty string for a null value", () => {
    const { host } = render({
      div: [
        {
          div: [{ div: "N", $: [selectItem({ value: "a" })] }],
          $: [selectList({ value: null, name: "maybe" })],
        },
      ],
    } as DomphyElement);
    const input = host.querySelector(
      "input[name=maybe]",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// selectItem
// ---------------------------------------------------------------------------

describe("selectItem", () => {
  it("toggles selection on click in single mode", () => {
    const value = toState<number | string | null>(null);
    const { host } = render({
      div: [
        {
          div: [{ div: "A", $: [selectItem({ value: "a" })] }],
          $: [selectList({ value })],
        },
      ],
    } as DomphyElement);
    const option = host.querySelector("[role=option]") as HTMLElement;
    option.click();
    flushSync();
    expect(value.get()).toBe("a");
  });
});

// ---------------------------------------------------------------------------
// command / commandSearch / commandItem
// ---------------------------------------------------------------------------

describe("command palette", () => {
  it("warns when commandSearch is used outside a command", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ input: null, $: [commandSearch()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("commandSearch"));
  });

  it("sets role=option on command items", () => {
    const { host } = render({
      div: [
        {
          div: [{ button: "Open file", $: [commandItem()] }],
          $: [command()],
        },
      ],
    } as DomphyElement);
    expect(host.querySelector("[role=option]")).not.toBeNull();
  });

  it("hides items on a non-matching query and shows them again when cleared", () => {
    const { host } = render({
      div: [
        {
          div: [
            { input: null, $: [commandSearch()] },
            { button: "Apple", $: [commandItem()] },
            { button: "Banana", $: [commandItem()] },
          ],
          $: [command()],
        },
      ],
    } as DomphyElement);

    const input = host.querySelector("input") as HTMLInputElement;
    const items = () =>
      Array.from(host.querySelectorAll("[role=option]")) as HTMLElement[];

    // No query: every item visible.
    expect(items().every((i) => !i.hidden)).toBe(true);

    // A query that matches no item label hides all options.
    input.value = "zzz-no-match";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(items().every((i) => i.hidden)).toBe(true);

    // Clearing the query reveals every item again.
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(items().every((i) => !i.hidden)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectBox
// ---------------------------------------------------------------------------

describe("selectBox", () => {
  it("warns when applied to a non-div element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [
        {
          span: "x",
          $: [selectBox({ content: { div: [] } })],
        },
      ],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("selectBox"));
  });

  it("renders a tag for each selected option label", () => {
    const { host } = render({
      div: [
        {
          div: null,
          $: [
            selectBox({
              value: "a",
              options: [
                { label: "Alpha", value: "a" },
                { label: "Beta", value: "b" },
              ],
              content: { div: [] },
            }),
          ],
        },
      ],
    } as DomphyElement);
    expect(host.textContent).toContain("Alpha");
    expect(host.textContent).not.toContain("Beta");
  });
});

// ---------------------------------------------------------------------------
// combobox
// ---------------------------------------------------------------------------

describe("combobox", () => {
  beforeEach(() => vi.useFakeTimers());

  it("warns when applied to a non-div element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [
        {
          span: "x",
          $: [combobox({ content: { div: [] } })],
        },
      ],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("combobox"));
  });

  it("renders an input plus a tag per selected value", () => {
    const { host } = render({
      div: [
        {
          div: null,
          $: [
            combobox({
              multiple: true,
              value: ["a"],
              options: [
                { label: "Alpha", value: "a" },
                { label: "Beta", value: "b" },
              ],
              content: { div: [] },
            }),
          ],
        },
      ],
    } as DomphyElement);
    expect(host.querySelector("input")).not.toBeNull();
    expect(host.textContent).toContain("Alpha");
  });

  it("removes a value from state when its tag's remove button is clicked", () => {
    const value = toState<Array<number | string | null | undefined>>([
      "a",
      "b",
    ]);
    const { host } = render({
      div: [
        {
          div: null,
          $: [
            combobox({
              multiple: true,
              value,
              options: [
                { label: "Alpha", value: "a" },
                { label: "Beta", value: "b" },
              ],
              content: { div: [] },
            }),
          ],
        },
      ],
    } as DomphyElement);

    // Each removable tag is a <span> chip whose last child <span> carries the
    // remove handler (tag() inserts it and calls node.remove() on click, which
    // triggers the combobox's _onRemove to filter the value).
    const chips = Array.from(host.querySelectorAll("span")).filter((s) =>
      s.textContent?.includes("Alpha"),
    ) as HTMLElement[];
    expect(chips.length).toBeGreaterThan(0);
    const removeButton = chips[0].querySelector(
      "span:last-child",
    ) as HTMLElement;
    expect(removeButton).not.toBeNull();
    removeButton.click();
    flushSync();
    vi.advanceTimersByTime(0);
    expect(value.get()).toEqual(["b"]);
  });
});
