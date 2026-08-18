// @vitest-environment jsdom
// Overlay audit slice: H05/H06 + M12–M19. Real patches only.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  combobox,
  datePicker,
  dialog,
  drawer,
  menu,
  popover,
  selectBox,
} from "../src/index.ts";
import { _resetScrollLock } from "../src/utils/scrollLock.ts";

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

beforeEach(() => {
  (HTMLDialogElement.prototype as any).showModal = function showModal() {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function close() {
    this.open = false;
  };
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  _resetScrollLock();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("H05: open.set(true) / open:true inserts the floating panel", () => {
  beforeEach(() => vi.useFakeTimers());

  it(
    "popover open.set(true) inserts the panel without a click",
    () => {
      const open = toState(false);
      const { host } = render({
        div: [
          {
            button: "Trigger",
            $: [popover({ open, content: { div: "H05_SET_TRUE" } })],
          },
        ],
      } as DomphyElement);
      expect(host.textContent ?? "").not.toContain("H05_SET_TRUE");
      open.set(true);
      flushSync();
      expect(host.textContent ?? "").toContain("H05_SET_TRUE");
    },
    20_000,
  );

  it("popover open:true inserts the panel on mount", () => {
    const { host } = render({
      div: [
        {
          button: "Trigger",
          $: [popover({ open: true, content: { div: "H05_OPEN_TRUE" } })],
        },
      ],
    } as DomphyElement);
    expect(host.textContent ?? "").toContain("H05_OPEN_TRUE");
  });

  it("selectBox / combobox honor a caller-owned open state", () => {
    const boxOpen = toState(false);
    const comboOpen = toState(false);
    const { host } = render({
      div: [
        {
          div: null,
          class: "sb",
          $: [
            selectBox({
              open: boxOpen,
              options: [],
              content: { div: "SB_PANEL" },
            }),
          ],
        },
        {
          div: null,
          class: "cb",
          $: [
            combobox({
              open: comboOpen,
              options: [],
              content: { div: "CB_PANEL" },
            }),
          ],
        },
      ],
    } as DomphyElement);
    expect(host.textContent ?? "").not.toContain("SB_PANEL");
    expect(host.textContent ?? "").not.toContain("CB_PANEL");
    boxOpen.set(true);
    comboOpen.set(true);
    flushSync();
    expect(host.textContent ?? "").toContain("SB_PANEL");
    expect(host.textContent ?? "").toContain("CB_PANEL");
  });
});

describe("H06: drawer uses behavior(); reuse still calls showModal", () => {
  beforeEach(() => vi.useFakeTimers());

  it("calls showModal after ancestor re-renders (not gen-1 _onMount only)", () => {
    const open = toState(false);
    const refresh = toState(0);
    const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    (HTMLDialogElement.prototype as any).showModal = showModal;

    const { host } = render({
      div: (listener: { get?: unknown }) => {
        refresh.get(listener as never);
        return [
          {
            dialog: [],
            class: "dr",
            $: [drawer({ open })],
          },
        ];
      },
    } as DomphyElement);

    for (let i = 1; i <= 3; i++) {
      refresh.set(i);
      flushSync();
    }
    showModal.mockClear();
    open.set(true);
    flushSync();
    expect(showModal).toHaveBeenCalled();
    const dlg = host.querySelector(".dr") as HTMLDialogElement;
    expect(dlg.open).toBe(true);
    expect(dlg.style.visibility).toBe("visible");
  });
});

describe("M12: drawer showModal guard, clearTimeout, backdrop rect", () => {
  beforeEach(() => vi.useFakeTimers());

  it("does not call showModal when the dialog is already open", () => {
    const open = toState(true);
    const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    (HTMLDialogElement.prototype as any).showModal = showModal;

    render({
      dialog: [],
      $: [drawer({ open })],
    } as DomphyElement);
    expect(showModal).toHaveBeenCalledTimes(1);
    open.set(true);
    flushSync();
    expect(showModal).toHaveBeenCalledTimes(1);
  });

  it("clears the close fallback timer when reopened before it fires", () => {
    const open = toState(true);
    const { host } = render({
      dialog: [],
      $: [drawer({ open })],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    open.set(false);
    flushSync();
    open.set(true);
    flushSync();
    vi.advanceTimersByTime(400);
    expect(dlg.open).toBe(true);
    expect(dlg.style.visibility).toBe("visible");
  });

  it("click inside the drawer panel does not close; backdrop click does", () => {
    const open = toState(true);
    const { host } = render({
      dialog: [],
      $: [drawer({ open })],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    vi.spyOn(dlg, "getBoundingClientRect").mockReturnValue({
      left: 100,
      right: 400,
      top: 0,
      bottom: 400,
      width: 300,
      height: 400,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    dlg.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 200, clientY: 50 }),
    );
    flushSync();
    expect(open.get()).toBe(true);

    dlg.dispatchEvent(
      new MouseEvent("click", { bubbles: true, clientX: 10, clientY: 10 }),
    );
    flushSync();
    expect(open.get()).toBe(false);
  });
});

describe("M13: popover click-mode blur must not close", () => {
  beforeEach(() => vi.useFakeTimers());

  it("blur does not close when openOn is click", () => {
    const open = toState(true);
    const { host } = render({
      div: [
        {
          button: "Open",
          $: [popover({ openOn: "click", open, content: { div: "KEEP" } })],
        },
      ],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    expect(open.get()).toBe(true);
    btn.dispatchEvent(
      new FocusEvent("blur", { bubbles: true, relatedTarget: document.body }),
    );
    flushSync();
    expect(open.get()).toBe(true);
    expect(host.textContent ?? "").toContain("KEEP");
  });

  it("blur still closes when openOn is hover", () => {
    const open = toState(true);
    const { host } = render({
      div: [
        {
          button: "Hover",
          $: [popover({ openOn: "hover", open, content: { div: "GONE" } })],
        },
      ],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.dispatchEvent(
      new FocusEvent("blur", { bubbles: true, relatedTarget: document.body }),
    );
    vi.advanceTimersByTime(150);
    flushSync();
    expect(open.get()).toBe(false);
  });
});

describe("M14: floating overlay portals into the open dialog", () => {
  beforeEach(() => vi.useFakeTimers());

  it("a popover inside a modal dialog lands inside the dialog, not the root overlay", () => {
    const dlgOpen = toState(true);
    const popOpen = toState(true);
    const { host } = render({
      dialog: [
        {
          button: "In dialog",
          $: [popover({ open: popOpen, content: { div: "IN_DIALOG_PANEL" } })],
        },
      ],
      $: [dialog({ open: dlgOpen })],
    } as DomphyElement);
    const dlg = host.querySelector("dialog")!;
    expect(dlg.textContent ?? "").toContain("IN_DIALOG_PANEL");
    expect(dlg.querySelector("#domphy-floating")).not.toBeNull();
  });
});

describe("M15: selectBox / combobox wrap options update across generations", () => {
  it("selectBox tags follow later options after an ancestor re-render", () => {
    const options = toState([{ label: "Alpha", value: "a" }]);
    const value = toState("a");
    const refresh = toState(0);
    const { host } = render({
      div: [
        {
          div: (listener: { get?: unknown }) => {
            refresh.get(listener as never);
            return [
              {
                div: null,
                class: "sb",
                _key: 1,
                $: [
                  selectBox({
                    value,
                    options: options.get(),
                    content: { div: "list" },
                  }),
                ],
              },
            ];
          },
        },
      ],
    } as DomphyElement);
    const box = () => host.querySelector(".sb") as HTMLElement;
    expect(box().textContent ?? "").toContain("Alpha");

    options.set([{ label: "Beta", value: "b" }]);
    value.set("b");
    refresh.set(1);
    flushSync();
    expect(box().textContent ?? "").toContain("Beta");
    expect(box().textContent ?? "").not.toContain("Alpha");
  });

  it("combobox tags follow later options after an ancestor re-render", () => {
    const options = toState([{ label: "Alpha", value: "a" }]);
    const value = toState("a");
    const refresh = toState(0);
    const { host } = render({
      div: [
        {
          div: (listener: { get?: unknown }) => {
            refresh.get(listener as never);
            return [
              {
                div: null,
                class: "cb",
                _key: 1,
                $: [
                  combobox({
                    value,
                    options: options.get(),
                    content: { div: "list" },
                  }),
                ],
              },
            ];
          },
        },
      ],
    } as DomphyElement);
    const box = () => host.querySelector(".cb") as HTMLElement;
    expect(box().textContent ?? "").toContain("Alpha");

    options.set([{ label: "Beta", value: "b" }]);
    value.set("b");
    refresh.set(1);
    flushSync();
    expect(box().textContent ?? "").toContain("Beta");
    expect(box().textContent ?? "").not.toContain("Alpha");
  });
});

describe("M16: menu items rebuild on patch/update", () => {
  it("replaces menuitems when the items array changes on a reused node", () => {
    const items = toState([{ label: "One", key: "1" }]);
    const refresh = toState(0);
    const { host } = render({
      div: (listener: { get?: unknown }) => {
        refresh.get(listener as never);
        return [{ div: null, $: [menu({ items: items.get() })] }];
      },
    } as DomphyElement);
    expect(host.textContent ?? "").toContain("One");
    expect(host.querySelectorAll("[role=menuitem]").length).toBe(1);

    items.set([
      { label: "Two", key: "2" },
      { label: "Three", key: "3" },
    ]);
    refresh.set(1);
    flushSync();
    expect(host.textContent ?? "").toContain("Two");
    expect(host.textContent ?? "").toContain("Three");
    expect(host.textContent ?? "").not.toContain("One");
    expect(host.querySelectorAll("[role=menuitem]").length).toBe(2);
  });
});

describe("M17: datePicker does not overwrite a caller Date", () => {
  it("a new caller Date on re-render wins over the previous internal selection", () => {
    const date = toState(new Date(2024, 0, 15));
    const refresh = toState(0);
    const { host } = render({
      div: (listener: { get?: unknown }) => {
        refresh.get(listener as never);
        return [
          {
            input: null,
            $: [datePicker({ value: date.get(), locale: "en-US" })],
          },
        ];
      },
    } as DomphyElement);
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.value).toContain("15");
    expect(input.value).toContain("2024");

    date.set(new Date(2024, 5, 20));
    refresh.set(1);
    flushSync();
    expect(input.value).toContain("20");
    expect(input.value).toMatch(/Jun/i);
  });
});

describe("M18: combobox input value + combobox ARIA", () => {
  beforeEach(() => vi.useFakeTimers());

  it("keeps typed filter text (value is not stuck at empty)", () => {
    const { host } = render({
      div: null,
      $: [combobox({ options: [], content: { div: "list" } })],
    } as DomphyElement);
    const input = host.querySelector("input") as HTMLInputElement;
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    expect(input.value).toBe("abc");
  });

  it("default input has role=combobox, aria-controls, aria-expanded", () => {
    const open = toState(false);
    const { host } = render({
      div: null,
      $: [combobox({ open, options: [], content: { div: "list" } })],
    } as DomphyElement);
    const input = host.querySelector("input")!;
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-controls")).toMatch(/^domphy-combobox-/);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    open.set(true);
    flushSync();
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("M19: selectBox aria-controls; datePicker aria-expanded/aria-controls", () => {
  it("selectBox trigger exposes aria-controls for the listbox panel", () => {
    const { host } = render({
      div: null,
      $: [selectBox({ options: [], content: { div: "list" } })],
    } as DomphyElement);
    const box = host.querySelector("[role=button]")!;
    expect(box.getAttribute("aria-controls")).toMatch(/^domphy-selectBox-/);
  });

  it("datePicker trigger exposes aria-expanded and aria-controls", () => {
    vi.useFakeTimers();
    const { host } = render({
      input: null,
      $: [datePicker({ locale: "en-US" })],
    } as DomphyElement);
    const input = host.querySelector("input")!;
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("aria-controls")).toMatch(/^domphy-datePicker-/);

    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    expect(input.getAttribute("aria-expanded")).toBe("true");
  });
});
