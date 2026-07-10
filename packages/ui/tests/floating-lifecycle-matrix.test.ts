// @vitest-environment jsdom
// Lifecycle matrix: every createFloating() consumer (popover, tooltip,
// selectBox, combobox, datePicker) driven through the same set of lifecycle
// transitions that historically produced bugs (0.18.15–0.18.17 were all in
// this class): ancestor re-renders before/while open, anchor removal, and
// stacked generations. Plus the shared-anchor case: two DIFFERENT floating
// components patched onto ONE element must not permanently break each other.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { combobox, datePicker, popover, selectBox, tooltip } from "../src/index.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// See popover-rerender-repro.test.ts for why both resets are required:
// pending 100ms show/hide timers against a shared fake clock, and the
// fixed-id #domphy-floating overlay accumulating across mounted roots.
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const MARKER = "MATRIX_PANEL";
const OPEN_DELAY = 150; // show/hide debounce is 100ms

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function overlay(host: HTMLElement): HTMLElement | null {
  return host.querySelector("#domphy-floating");
}

type Driver = {
  name: string;
  // Fresh anchor element per call — invoked INSIDE the reactive render
  // function so every re-render produces a fresh factory closure on the
  // same reused DOM node (the exact shape of the historical bugs).
  anchor: () => DomphyElement;
  open: (host: HTMLElement) => void;
  hasPanel: (host: HTMLElement) => boolean;
  panelCount: (host: HTMLElement) => number;
};

const containsMarker = (el: Element) => !!el.textContent?.includes(MARKER);
const containsCalendar = (el: Element) => !!el.querySelector("[data-date]");

function markerDriver(
  name: string,
  anchor: () => DomphyElement,
  open: (host: HTMLElement) => void,
  matches: (el: Element) => boolean = containsMarker,
): Driver {
  return {
    name,
    anchor,
    open,
    hasPanel: (host) => {
      const o = overlay(host);
      return !!o && matches(o);
    },
    panelCount: (host) => {
      const o = overlay(host);
      if (!o) return 0;
      return Array.from(o.children).filter(matches).length;
    },
  };
}

const drivers: Driver[] = [
  markerDriver(
    "popover",
    () => ({
      button: "trigger",
      class: "anchor",
      $: [popover({ content: { div: MARKER } })],
    }),
    (host) => (host.querySelector(".anchor") as HTMLElement).click(),
  ),
  markerDriver(
    "tooltip",
    () => ({
      button: "trigger",
      class: "anchor",
      $: [tooltip({ content: MARKER })],
    }),
    (host) =>
      host
        .querySelector(".anchor")!
        .dispatchEvent(new Event("mouseenter", { bubbles: true })),
  ),
  markerDriver(
    "selectBox",
    () => ({
      div: null,
      class: "anchor",
      $: [selectBox({ content: { div: MARKER }, options: [] })],
    }),
    (host) => (host.querySelector(".anchor") as HTMLElement).click(),
  ),
  markerDriver(
    "combobox",
    () => ({
      div: null,
      class: "anchor",
      $: [combobox({ content: { div: MARKER }, options: [] })],
    }),
    (host) =>
      host.querySelector(".anchor input")!.dispatchEvent(new Event("focus")),
  ),
  markerDriver(
    "datePicker",
    () => ({
      input: null,
      class: "anchor",
      $: [datePicker()],
    }),
    (host) => (host.querySelector(".anchor") as HTMLElement).click(),
    containsCalendar,
  ),
];

// Reactive keyed row list inside a STABLE outer div — matching real app
// structure. The overlay portal is inserted as a child of the trigger's
// root; if the reactive div were the root itself, its own re-render would
// wipe the overlay as a side effect of the test's shape, not the behavior
// under test (same reasoning as popover-rerender-repro.test.ts).
function mountList(anchor: () => DomphyElement) {
  const items = toState([1]);
  const refresh = toState(0);
  const { host } = render({
    div: [
      {
        div: (l: any) => {
          refresh.get(l);
          return items.get(l).map((id: number) => ({
            div: [anchor()],
            _key: id,
          }));
        },
      },
    ],
  } as DomphyElement);
  const rerender = (times = 1) => {
    for (let i = 0; i < times; i++) {
      refresh.set(refresh.get() + 1);
      flushSync();
    }
  };
  const removeAnchor = () => {
    items.set([]);
    flushSync();
  };
  return { host, rerender, removeAnchor };
}

for (const d of drivers) {
  describe(`${d.name}: lifecycle matrix`, () => {
    it("control: opens on first interaction", () => {
      vi.useFakeTimers();
      const { host } = mountList(d.anchor);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);
      expect(d.panelCount(host)).toBe(1);
    });

    it("still opens after 3 ancestor re-renders (fresh closures on a reused node)", () => {
      vi.useFakeTimers();
      const { host, rerender } = mountList(d.anchor);
      rerender(3);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);
      expect(d.panelCount(host)).toBe(1);
    });

    it("re-render mid-open, then interacting via the new generation leaves exactly ONE panel", () => {
      vi.useFakeTimers();
      const { host, rerender } = mountList(d.anchor);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);

      rerender(1);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);
      expect(d.panelCount(host)).toBe(1);
    });

    it("removing the anchor while open removes the panel", () => {
      vi.useFakeTimers();
      const { host, removeAnchor } = mountList(d.anchor);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);

      removeAnchor();
      expect(d.hasPanel(host)).toBe(false);
    });

    it("removing the anchor after re-renders + open removes the CURRENT generation's panel", () => {
      vi.useFakeTimers();
      const { host, rerender, removeAnchor } = mountList(d.anchor);
      rerender(3);
      d.open(host);
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      expect(d.hasPanel(host)).toBe(true);

      removeAnchor();
      expect(d.hasPanel(host)).toBe(false);
    });
  });
}

describe("two floating components sharing ONE anchor element", () => {
  const TIP = "SHARED_TIP";
  const POP = "SHARED_POP";

  function mountShared() {
    const { host } = render({
      div: [
        {
          button: "trigger",
          class: "anchor",
          $: [tooltip({ content: TIP }), popover({ content: { div: POP } })],
        },
      ],
    } as DomphyElement);
    const btn = host.querySelector(".anchor") as HTMLElement;
    return { host, btn };
  }

  it("tooltip still works after the popover has been opened on the same anchor", () => {
    vi.useFakeTimers();
    const { host, btn } = mountShared();

    // 1. Hover → tooltip shows.
    btn.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(overlay(host)!.textContent).toContain(TIP);

    // 2. Leave, then click → popover shows.
    btn.dispatchEvent(new Event("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    btn.click();
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(overlay(host)!.textContent).toContain(POP);
    expect(btn.getAttribute("aria-expanded")).toBe("true");

    // 3. Hover again → the tooltip must STILL be able to show. A torn-down
    // floating instance must be re-mountable, not permanently dead.
    btn.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(overlay(host)!.textContent).toContain(TIP);
  });

  it("an open popover survives a tooltip hover/leave on the same anchor", () => {
    vi.useFakeTimers();
    const { host, btn } = mountShared();

    btn.click();
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(overlay(host)!.textContent).toContain(POP);
    expect(btn.getAttribute("aria-expanded")).toBe("true");

    // Hovering (tooltip show) then leaving (tooltip hide) must not kill the
    // open popover panel out from under its still-"open" state.
    btn.dispatchEvent(new Event("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    btn.dispatchEvent(new Event("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(overlay(host)!.textContent).toContain(POP);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("floating a11y and theming", () => {
  it("Escape pressed while focus is INSIDE the panel closes the popover", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [
        {
          button: "trigger",
          class: "anchor",
          $: [popover({ content: { div: [{ button: "Inside" }] } })],
        },
      ],
    } as DomphyElement);
    const trigger = host.querySelector(".anchor") as HTMLElement;

    trigger.click();
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // Keydown on the inner button — the panel is a portaled DOM SIBLING of
    // the anchor, so this never bubbles to the anchor's own Escape handler.
    const inner = Array.from(overlay(host)!.querySelectorAll("button")).find(
      (candidate) => candidate.textContent === "Inside",
    )!;
    inner.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("each panel inherits data-theme from ITS OWN anchor's scope, not from whichever anchor opened first", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [
        {
          div: [
            {
              button: "dark trigger",
              class: "dark-anchor",
              $: [popover({ content: { div: "DARK_PANEL" } })],
            },
          ],
          dataTheme: "dark",
        },
        {
          div: [
            {
              button: "light trigger",
              class: "light-anchor",
              $: [popover({ content: { div: "LIGHT_PANEL" } })],
            },
          ],
          dataTheme: "light",
        },
      ],
    } as DomphyElement);

    (host.querySelector(".dark-anchor") as HTMLElement).click();
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    const darkPanel = Array.from(overlay(host)!.children).find((child) =>
      child.textContent?.includes("DARK_PANEL"),
    )!;
    expect(darkPanel.closest("[data-theme]")?.getAttribute("data-theme")).toBe(
      "dark",
    );

    (host.querySelector(".light-anchor") as HTMLElement).click();
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
    const lightPanel = Array.from(overlay(host)!.children).find((child) =>
      child.textContent?.includes("LIGHT_PANEL"),
    )!;
    expect(
      lightPanel.closest("[data-theme]")?.getAttribute("data-theme"),
    ).toBe("light");
  });
});

describe("floating listener hygiene", () => {
  it("popover: every root-level click listener added is removed when the anchor is removed", () => {
    vi.useFakeTimers();
    const log: Array<{ op: "add" | "remove"; target: EventTarget; type: string }> = [];
    const originalAdd = EventTarget.prototype.addEventListener;
    const originalRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type: string, ...rest: any[]) {
      log.push({ op: "add", target: this, type });
      return (originalAdd as any).call(this, type, ...rest);
    };
    EventTarget.prototype.removeEventListener = function (type: string, ...rest: any[]) {
      log.push({ op: "remove", target: this, type });
      return (originalRemove as any).call(this, type, ...rest);
    };

    try {
      const items = toState([1, 2, 3]);
      const { host } = render({
        div: [
          {
            div: (l: any) =>
              items.get(l).map((id: number) => ({
                div: [
                  {
                    button: `open ${id}`,
                    $: [popover({ content: { div: `panel ${id}` } })],
                  },
                ],
                _key: id,
              })),
          },
        ],
      } as DomphyElement);
      const root = host.firstElementChild as HTMLElement;

      // Open one so autoUpdate/scroll listeners exist too, then remove all.
      (host.querySelector("button") as HTMLElement).click();
      vi.advanceTimersByTime(OPEN_DELAY);
      flushSync();
      items.set([]);
      flushSync();

      const rootClicks = log.filter((e) => e.target === root && e.type === "click");
      const adds = rootClicks.filter((e) => e.op === "add").length;
      const removes = rootClicks.filter((e) => e.op === "remove").length;
      expect(adds).toBeGreaterThan(0); // sanity: the outside-click handler was registered
      expect(removes).toBe(adds);
    } finally {
      EventTarget.prototype.addEventListener = originalAdd;
      EventTarget.prototype.removeEventListener = originalRemove;
    }
  });
});
