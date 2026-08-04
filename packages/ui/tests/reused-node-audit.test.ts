// @vitest-environment jsdom
// 2026-08-03 enterprise audit repros: patches whose internal uncontrolled
// state is allocated fresh per factory call, while ElementNode lifecycle
// hooks run ONCE per real DOM node. After an ancestor re-render (fresh
// closure on the SAME reused node), gen-N bindings read gen-N's fresh state
// (initial values) while gen-1's _onMount already ran — uncontrolled
// selection/visibility snaps back to defaults.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  combobox,
  datePicker,
  drawer,
  menu,
  segmented,
  selectBox,
  tabs,
  toast,
  toggleGroup,
  tooltip,
} from "../src/index.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

// Reactive keyed row inside a STABLE outer div (same shape as
// floating-lifecycle-matrix.test.ts): every refresh re-invokes the patch
// factory, producing a fresh closure on the same reused DOM node.
function mountReactive(child: () => DomphyElement) {
  const refresh = toState(0);
  const { host } = render({
    div: [
      {
        div: (l: any) => {
          refresh.get(l);
          return [{ div: [child()], _key: 1 }];
        },
      },
    ],
  } as DomphyElement);
  const rerender = () => {
    refresh.set(refresh.get() + 1);
    flushSync();
  };
  return { host, rerender };
}

// Reactive styles are CSS-in-JS (generated rules, not inline) — read the
// CSSOM rule for the element's auto scope class.
function generatedStyle(el: HTMLElement, prop: string): string {
  const scope = Array.from(el.classList).find((c) =>
    /^[a-z]+_[a-z0-9]/.test(c),
  );
  if (!scope) return "";
  let found = "";
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const styleRule = rule as CSSStyleRule;
      if (
        styleRule.selectorText === `.${scope}` &&
        styleRule.style.getPropertyValue(prop)
      ) {
        found = styleRule.style.getPropertyValue(prop);
      }
    }
  }
  return found;
}

describe("toast: reused-node lifecycle", () => {
  it("stays visible after an ancestor re-render", () => {
    vi.useFakeTimers();
    const { host, rerender } = mountReactive(() => ({
      div: "Msg",
      class: "toast",
      $: [toast()],
    }));
    vi.advanceTimersByTime(50); // _onMount rAF -> state.set(true)
    flushSync();
    const el = host.querySelector(".toast") as HTMLElement;
    expect(generatedStyle(el, "opacity")).toBe("1");

    rerender();
    expect(generatedStyle(el, "opacity")).toBe("1");
  });
});

describe("tabs: uncontrolled selection survives ancestor re-render", () => {
  it("keeps the clicked tab selected", () => {
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [
        tabs({
          items: [
            { label: "One", content: { p: "one" }, key: "one" },
            { label: "Two", content: { p: "two" }, key: "two" },
          ],
        }),
      ],
    }));
    const buttons = () =>
      Array.from(host.querySelectorAll<HTMLElement>("[role=tab]"));
    buttons()[1].click();
    flushSync();
    expect(buttons()[1].getAttribute("aria-selected")).toBe("true");

    rerender();
    expect(buttons()[1].getAttribute("aria-selected")).toBe("true");
    // Panels must agree with the triggers.
    const panels = Array.from(
      host.querySelectorAll<HTMLElement>("[role=tabpanel]"),
    );
    expect(panels[1].hidden).toBe(false);
    expect(panels[0].hidden).toBe(true);
  });
});

describe("segmented: uncontrolled selection survives ancestor re-render", () => {
  it("keeps the clicked segment checked", () => {
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [
        segmented({
          items: [
            { label: "Day", key: "day" },
            { label: "Month", key: "month" },
          ],
        }),
      ],
    }));
    const buttons = () =>
      Array.from(host.querySelectorAll<HTMLElement>("[role=radio]"));
    buttons()[1].click();
    flushSync();
    expect(buttons()[1].getAttribute("aria-checked")).toBe("true");

    rerender();
    expect(buttons()[1].getAttribute("aria-checked")).toBe("true");
  });
});

describe("toggleGroup: uncontrolled selection survives ancestor re-render", () => {
  it("keeps the clicked toggle pressed", () => {
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [
        toggleGroup({
          items: [
            { label: "Bold", key: "bold" },
            { label: "Italic", key: "italic" },
          ],
        }),
      ],
    }));
    const buttons = () =>
      Array.from(host.querySelectorAll<HTMLElement>("button"));
    buttons()[1].click();
    flushSync();
    expect(buttons()[1].getAttribute("aria-pressed")).toBe("true");

    rerender();
    expect(buttons()[1].getAttribute("aria-pressed")).toBe("true");
  });
});

describe("menu: uncontrolled selection survives ancestor re-render", () => {
  it("keeps the clicked item current", () => {
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [
        menu({
          items: [
            { label: "Profile", key: "profile" },
            { label: "Settings", key: "settings" },
          ],
        }),
      ],
    }));
    const items = () =>
      Array.from(host.querySelectorAll<HTMLElement>("[role=menuitem]"));
    items()[1].click();
    flushSync();
    expect(items()[1].getAttribute("aria-current")).toBe("true");

    rerender();
    expect(items()[1].getAttribute("aria-current")).toBe("true");
  });
});

describe("datePicker: reused-node lifecycle", () => {
  it("closes the calendar after selecting a day (single mode)", () => {
    vi.useFakeTimers();
    const { host } = mountReactive(() => ({
      input: null,
      class: "dp",
      $: [datePicker({ locale: "en-US" })],
    }));
    (host.querySelector(".dp") as HTMLElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    vi.advanceTimersByTime(200);
    flushSync();
    expect(document.querySelector("[data-date]")).not.toBeNull();

    const cell = Array.from(
      document.querySelectorAll<HTMLElement>("[data-date]"),
    ).find(
      (c) =>
        c.textContent === "15" && c.getAttribute("aria-disabled") !== "true",
    )!;
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    expect(document.querySelector("[data-date]")).toBeNull();
  });

  it("keeps the selected value in the input after an ancestor re-render (uncontrolled)", () => {
    vi.useFakeTimers();
    const { host, rerender } = mountReactive(() => ({
      input: null,
      class: "dp",
      $: [datePicker({ locale: "en-US" })],
    }));
    const input = host.querySelector(".dp") as HTMLInputElement;
    input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    const cell = Array.from(
      document.querySelectorAll<HTMLElement>("[data-date]"),
    ).find(
      (c) =>
        c.textContent === "15" && c.getAttribute("aria-disabled") !== "true",
    )!;
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    expect(input.value).toContain("15");

    rerender();
    expect(input.value).toContain("15");
  });
});

describe("selectBox/combobox: panel-originated close", () => {
  it("selectBox closes the dropdown when an option inside the panel is clicked (single)", () => {
    vi.useFakeTimers();
    const { host } = mountReactive(() => ({
      div: null,
      class: "sb",
      $: [
        selectBox({
          options: [{ label: "A", value: "a" }],
          content: { div: [{ button: "Option A", type: "button" }] },
        }),
      ],
    }));
    (host.querySelector(".sb") as HTMLElement).click();
    vi.advanceTimersByTime(200);
    flushSync();
    const panel = () => document.querySelector("#domphy-floating");
    expect(panel()?.textContent).toContain("Option A");

    const option = Array.from(panel()!.querySelectorAll("button")).find(
      (b) => b.textContent === "Option A",
    )!;
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    expect(panel()?.textContent ?? "").not.toContain("Option A");
  });

  it("combobox closes the popover when an option inside the panel is clicked (single)", () => {
    vi.useFakeTimers();
    const { host } = mountReactive(() => ({
      div: null,
      class: "cb",
      $: [
        combobox({
          options: [{ label: "A", value: "a" }],
          content: { div: [{ button: "Option A", type: "button" }] },
        }),
      ],
    }));
    host.querySelector(".cb input")!.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(200);
    flushSync();
    const panel = () => document.querySelector("#domphy-floating");
    expect(panel()?.textContent).toContain("Option A");

    const option = Array.from(panel()!.querySelectorAll("button")).find(
      (b) => b.textContent === "Option A",
    )!;
    option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    expect(panel()?.textContent ?? "").not.toContain("Option A");
  });
});

describe("tooltip: document-level Escape dismisses a hover-opened panel", () => {
  it("closes on Escape even when focus is NOT on the trigger (Radix parity)", () => {
    vi.useFakeTimers();
    const { host } = mountReactive(() => ({
      button: "Hover me",
      class: "tip",
      $: [tooltip({ content: "TIP_TEXT" })],
    }));
    host
      .querySelector(".tip")!
      .dispatchEvent(new Event("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(200);
    flushSync();
    expect(document.querySelector("#domphy-floating")?.textContent).toContain(
      "TIP_TEXT",
    );

    // Focus is on <body> (mouse-only hover) — Escape must still dismiss.
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    vi.advanceTimersByTime(200);
    flushSync();
    expect(
      document.querySelector("#domphy-floating")?.textContent ?? "",
    ).not.toContain("TIP_TEXT");
  });
});

describe("drawer: caller-owned state survives ancestor re-renders (control)", () => {
  it("opens, closes and reopens via the caller state after re-renders", () => {
    vi.useFakeTimers();
    const open = toState(false);
    const refresh = toState(0);
    const { host } = render({
      div: [
        {
          div: (l: any) => {
            refresh.get(l);
            return [
              {
                div: [{ dialog: [], class: "dr", $: [drawer({ open })] }],
                _key: 1,
              },
            ];
          },
        },
      ],
    } as DomphyElement);
    const dlg = host.querySelector(".dr") as HTMLElement;

    for (let i = 0; i < 3; i++) {
      refresh.set(i + 1);
      flushSync();
    }
    open.set(true);
    flushSync();
    vi.advanceTimersByTime(50);
    expect(dlg.style.visibility).toBe("visible");

    refresh.set(4);
    flushSync();
    open.set(false);
    flushSync();
    vi.advanceTimersByTime(400); // close fallback timer
    expect(dlg.style.visibility).toBe("hidden");

    open.set(true);
    flushSync();
    vi.advanceTimersByTime(50);
    expect(dlg.style.visibility).toBe("visible");
  });
});
