// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  alert,
  dialog,
  drawer,
  errorBoundary,
  popover,
  toast,
  tooltip,
} from "../src/index.ts";
import { _resetScrollLock } from "../src/utils/scrollLock.ts";

// ResizeObserver is used by @domphy/floating (tooltip/popover).
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

function listenerCount(state: any): number {
  const listeners = state?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

beforeEach(() => {
  (HTMLDialogElement.prototype as any).showModal = function () {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function () {
    this.open = false;
  };
  // Drawer/dialog patches call dlg.close() in a fallback timer even when the
  // host is a non-dialog element (warn test case). Stub close on HTMLElement so
  // the fallback timer does not throw "not a function" during fake-timer drain.
  if (!(HTMLElement.prototype as any).close) {
    (HTMLElement.prototype as any).close = () => {};
  }
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  // Tests that don't call node.remove() skip the Remove hook (unlockScroll),
  // which would otherwise leak the module-level lock count into later tests.
  _resetScrollLock();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// drawer
// Drawer close path has a 350ms fallback setTimeout — use fake timers so the
// timer is drained before afterEach tears down the DOM, avoiding
// "dlg.close is not a function" unhandled errors on non-dialog elements.
// ---------------------------------------------------------------------------

describe("drawer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.runAllTimers()); // drain before DOM is cleared

  it("warns when applied to a non-dialog tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: "content", $: [drawer()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("drawer"));
  });

  it("locks body scroll when opened", () => {
    const open = toState(false);
    render({
      div: [{ dialog: [], $: [drawer({ open })] }],
    } as DomphyElement);
    expect(document.body.style.overflow).toBe("");
    open.set(true);
    flushSync();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll on removal while open", () => {
    const open = toState(true);
    const { node } = render({
      div: [{ dialog: [], $: [drawer({ open })] }],
    } as DomphyElement);
    expect(document.body.style.overflow).toBe("hidden");
    expect(listenerCount(open)).toBeGreaterThanOrEqual(1);

    node.remove();
    expect(document.body.style.overflow).toBe("");
    expect(listenerCount(open)).toBe(0);
  });

  it("sets aria-modal on the dialog element", () => {
    const { host } = render({
      div: [{ dialog: [], $: [drawer()] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog");
    expect(dlg?.getAttribute("aria-modal")).toBe("true");
  });

  it("calls showModal when opened", () => {
    const open = toState(false);
    const { host } = render({
      div: [{ dialog: [], $: [drawer({ open })] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    expect(dlg.open).toBe(false);
    open.set(true);
    flushSync();
    expect(dlg.open).toBe(true);
  });

  // 2026-07-19 fix: a closed drawer was only ever represented by an off-screen
  // `transform` — never visibility/pointer-events, which a CSS transform
  // (like opacity) doesn't affect either way. That left every closed drawer's
  // content fully reachable by Tab and exposed to the accessibility tree.
  it("removes closed content from the tab order/a11y tree via visibility, not just an off-screen transform", () => {
    const open = toState(false);
    const { host } = render({
      div: [{ dialog: [{ button: "Action" }], $: [drawer({ open })] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    // Mounting already-closed runs the SAME close path as a real close (the
    // 350ms fallback timer, since there's no real opacity/transform change to
    // fire transitionend) — drain it to reach the settled inline state; the
    // static style block's own "hidden"/"none" defaults (asserted via
    // getComputedStyle, since jsdom resolves Domphy's compiled CSS class
    // there, not on the bare inline `.style`) cover the gap before that timer
    // fires.
    expect(getComputedStyle(dlg).visibility).toBe("hidden");
    expect(getComputedStyle(dlg).pointerEvents).toBe("none");
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(dlg.style.pointerEvents).toBe("none");

    open.set(true);
    flushSync();
    expect(dlg.style.visibility).toBe("visible");
    expect(dlg.style.pointerEvents).toBe("auto");

    open.set(false);
    flushSync();
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(dlg.style.pointerEvents).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// dialog
// Same 350ms fallback-timer shape as drawer above — fake timers for the same reason.
// ---------------------------------------------------------------------------

describe("dialog", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.runAllTimers());

  it("sets aria-modal on the dialog element", () => {
    const { host } = render({
      div: [{ dialog: [], $: [dialog()] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog");
    expect(dlg?.getAttribute("aria-modal")).toBe("true");
  });

  it("calls showModal when opened", () => {
    const open = toState(false);
    const { host } = render({
      div: [{ dialog: [], $: [dialog({ open })] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    expect(dlg.open).toBe(false);
    open.set(true);
    flushSync();
    expect(dlg.open).toBe(true);
  });

  // 2026-07-19 fix: a closed dialog was only ever represented by `opacity:
  // 0` — opacity, unlike visibility, never removes an element from the tab
  // order or the accessibility tree, so a closed dialog's buttons/inputs
  // stayed fully focusable and screen-reader-visible (confirmed live on
  // parashape.com: a "Delete account" confirm dialog that was never opened
  // still had a Tab-reachable button positioned off-screen).
  it("removes closed content from the tab order/a11y tree via visibility, not just opacity", () => {
    const open = toState(false);
    const { host } = render({
      div: [{ dialog: [{ button: "Delete account" }], $: [dialog({ open })] }],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    // See the equivalent drawer test above for why this checks computed style
    // first (the static default) and drains the fallback timer before
    // checking the imperative inline style.
    expect(getComputedStyle(dlg).visibility).toBe("hidden");
    expect(getComputedStyle(dlg).pointerEvents).toBe("none");
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(dlg.style.pointerEvents).toBe("none");

    open.set(true);
    flushSync();
    expect(dlg.style.visibility).toBe("visible");
    expect(dlg.style.pointerEvents).toBe("auto");

    open.set(false);
    flushSync();
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(dlg.style.pointerEvents).toBe("none");
  });

  it("restores focus to the previously focused element when closed", () => {
    const open = toState(false);
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    const focusSpy = vi.spyOn(trigger, "focus");

    const { host } = render({
      div: [
        {
          dialog: [{ button: "Confirm" }, { button: "Cancel" }],
          $: [dialog({ open })],
        },
      ],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;

    // Open while `trigger` is document.activeElement so dialog stores it as
    // previousFocus (Radix-style restore target).
    open.set(true);
    flushSync();
    expect(dlg.style.visibility).toBe("visible");
    focusSpy.mockClear();

    open.set(false);
    flushSync();
    // Close finalizes via transitionend or the 350ms fallback timer.
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(focusSpy).toHaveBeenCalled();
  });

  it("traps Tab focus within the dialog (shift+Tab from first cycles to last)", () => {
    const open = toState(true);
    const { host } = render({
      div: [
        {
          dialog: [{ button: "First" }, { button: "Last" }],
          $: [dialog({ open })],
        },
      ],
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;
    flushSync();
    vi.runAllTimers();

    const buttons = Array.from(dlg.querySelectorAll("button"));
    expect(buttons.length).toBe(2);
    const [first, last] = buttons;
    // Make both focusable/visible for offsetParent filter in trapFocus.
    Object.defineProperty(first, "offsetParent", { get: () => dlg });
    Object.defineProperty(last, "offsetParent", { get: () => dlg });
    first.focus();
    expect(document.activeElement).toBe(first);

    const shiftTab = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const prevented = !dlg.dispatchEvent(shiftTab) || shiftTab.defaultPrevented;
    // trapFocus should move focus to last and preventDefault.
    expect(prevented || document.activeElement === last).toBe(true);
    if (document.activeElement !== last) {
      // jsdom may not re-target focus on preventDefault alone — assert trap ran
      // by checking defaultPrevented after a real listener.
      last.focus();
      const tab = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      dlg.dispatchEvent(tab);
      expect(tab.defaultPrevented || document.activeElement === first).toBe(
        true,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// toast
// ---------------------------------------------------------------------------

describe("toast", () => {
  it("renders content inside a status role element", () => {
    const { host } = render({
      div: [{ div: "File saved", $: [toast()] }],
    } as DomphyElement);
    const toastEl = host.querySelector("[role='status']");
    expect(toastEl).not.toBeNull();
    expect(toastEl!.textContent).toContain("File saved");
  });

  it("creates an overlay container with the correct position id", () => {
    render({
      div: [{ div: "Msg", $: [toast({ position: "bottom-right" })] }],
    } as DomphyElement);
    expect(document.getElementById("domphy-toast-bottom-right")).not.toBeNull();
  });

  it("sets ariaAtomic='true' on the toast element", () => {
    const { host } = render({
      div: [{ div: "Msg", $: [toast({ position: "top-left" })] }],
    } as DomphyElement);
    const toastEl = host.querySelector("[role='status']");
    expect(toastEl?.getAttribute("aria-atomic")).toBe("true");
  });

  it("reuses an existing overlay container for the same position", () => {
    render({
      div: [
        { div: "First", $: [toast({ position: "top-right" })] },
        { div: "Second", $: [toast({ position: "top-right" })] },
      ],
    } as DomphyElement);
    const overlays = document.querySelectorAll("#domphy-toast-top-right");
    expect(overlays.length).toBe(1);
  });

  it("each position gets its own overlay container", () => {
    render({
      div: [
        { div: "A", $: [toast({ position: "top-left" })] },
        { div: "B", $: [toast({ position: "bottom-left" })] },
      ],
    } as DomphyElement);
    expect(document.getElementById("domphy-toast-top-left")).not.toBeNull();
    expect(document.getElementById("domphy-toast-bottom-left")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// alert
// ---------------------------------------------------------------------------

describe("alert", () => {
  it("renders with role='alert'", () => {
    const { host } = render({
      div: [{ div: "Warning!", $: [alert()] }],
    } as DomphyElement);
    const alertEl = host.querySelector("[role='alert']");
    expect(alertEl).not.toBeNull();
    expect(alertEl!.textContent).toContain("Warning!");
  });

  it("renders without throwing when no props given", () => {
    expect(() =>
      render({ div: [{ div: "ok", $: [alert()] }] } as DomphyElement),
    ).not.toThrow();
  });

  it("accepts a reactive color state and changing it does not throw", () => {
    const color = toState<any>("primary");
    render({
      div: [{ div: "Info", $: [alert({ color })] }],
    } as DomphyElement);
    expect(() => {
      color.set("danger");
      flushSync();
    }).not.toThrow();
  });

  it("sets dataTone='shift-2' on the host", () => {
    const { host } = render({
      div: [{ div: "Note", $: [alert()] }],
    } as DomphyElement);
    const alertEl = host.querySelector("[role='alert']");
    expect(alertEl?.getAttribute("data-tone")).toBe("shift-2");
  });

  it("rounds the alert surface", () => {
    const { node } = render({
      div: [{ div: "Note", $: [alert()] }],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("border-radius");
  });

  it("renders children content correctly", () => {
    const { host } = render({
      div: [
        {
          div: [{ span: "detail text" }],
          $: [alert({ color: "success" as any })],
        },
      ],
    } as DomphyElement);
    expect(host.querySelector("span")?.textContent).toBe("detail text");
  });
});

// ---------------------------------------------------------------------------
// tooltip
// Floating content is portaled to document root. Tests that need tooltip shown
// use fake timers to advance the 100ms show-debounce in createFloating.
// ---------------------------------------------------------------------------

describe("tooltip", () => {
  it("adds aria-describedby to the trigger element", () => {
    const { host } = render({
      div: [{ button: "Hover me", $: [tooltip({ content: "Help" })] }],
    } as DomphyElement);
    const btn = host.querySelector("button");
    expect(btn?.getAttribute("aria-describedby")).toMatch(/^domphy-tt-/);
  });

  it("does not throw when no content prop is given", () => {
    expect(() =>
      render({ div: [{ button: "Btn", $: [tooltip()] }] } as DomphyElement),
    ).not.toThrow();
  });

  it("renders tooltip content into the floating portal on show", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [{ button: "Btn", $: [tooltip({ content: "Tip text" })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    const floating = document.getElementById("domphy-floating");
    expect(floating?.textContent).toContain("Tip text");
  });

  it("renders without throwing when an explicit placement is given", () => {
    expect(() =>
      render({
        div: [
          {
            button: "Btn",
            $: [tooltip({ placement: "bottom", content: "Down" })],
          },
        ],
      } as DomphyElement),
    ).not.toThrow();
  });

  it("the tooltip element has role='tooltip'", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [{ button: "Btn", $: [tooltip({ content: "Tip" })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    const floating = document.getElementById("domphy-floating");
    expect(floating?.querySelector("[role='tooltip']")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// popover
// Floating content portaled to document root; click/hover use 100ms debounce.
// ---------------------------------------------------------------------------

describe("popover", () => {
  it("sets aria-haspopup='dialog' on the trigger", () => {
    const { host } = render({
      div: [
        { button: "Open", $: [popover({ content: { div: "Popover body" } })] },
      ],
    } as DomphyElement);
    const btn = host.querySelector("button");
    expect(btn?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("aria-expanded is false by default", () => {
    const { host } = render({
      div: [{ button: "Open", $: [popover({ content: { div: "Body" } })] }],
    } as DomphyElement);
    const btn = host.querySelector("button");
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking trigger toggles aria-expanded to true", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [{ button: "Open", $: [popover({ content: { div: "Body" } })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("clicking trigger twice toggles back to false", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [{ button: "Open", $: [popover({ content: { div: "Body" } })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("hover mode shows popover on mouseenter and hides on mouseleave", () => {
    vi.useFakeTimers();
    const open = toState(false);
    const { host } = render({
      div: [
        {
          button: "Hover",
          $: [popover({ openOn: "hover", open, content: { div: "Tip" } })],
        },
      ],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    expect(open.get()).toBe(true);
    btn.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    expect(open.get()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// errorBoundary
// The Error hook is walked up the ANCESTOR chain — the boundary must be a
// PARENT of the node whose reactive children function throws.
// ---------------------------------------------------------------------------

describe("errorBoundary", () => {
  it("renders fallback element on reactive child error", () => {
    let throwNext = false;
    const trigger = toState(false);

    const { host } = render({
      div: [
        {
          // boundary wraps the reactive node
          div: [
            {
              div: (listener: any) => {
                trigger.get(listener);
                if (throwNext) throw new Error("boom");
                return [];
              },
            },
          ],
          $: [errorBoundary({ fallback: { p: "Something went wrong." } })],
        },
      ],
    } as any);

    throwNext = true;
    trigger.set(true);
    flushSync();

    expect(host.querySelector("p")?.textContent).toBe("Something went wrong.");
  });

  it("calls onError with the thrown error", () => {
    let throwNext = false;
    const trigger = toState(false);
    const onError = vi.fn();

    render({
      div: [
        {
          div: [
            {
              div: (listener: any) => {
                trigger.get(listener);
                if (throwNext) throw new Error("test error");
                return [];
              },
            },
          ],
          $: [errorBoundary({ onError })],
        },
      ],
    } as any);

    throwNext = true;
    trigger.set(true);
    flushSync();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("uses fallback factory function with error and reset args", () => {
    let throwNext = false;
    const trigger = toState(false);
    const factory = vi.fn((_error: unknown, _reset: () => void) => ({
      div: "Factory fallback",
    }));

    const { host } = render({
      div: [
        {
          div: [
            {
              div: (listener: any) => {
                trigger.get(listener);
                if (throwNext) throw new Error("err");
                return [];
              },
            },
          ],
          $: [errorBoundary({ fallback: factory })],
        },
      ],
    } as any);

    throwNext = true;
    trigger.set(true);
    flushSync();

    expect(factory).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Factory fallback");
  });

  it("uses default fallback message when no fallback prop given", () => {
    let throwNext = false;
    const trigger = toState(false);

    const { host } = render({
      div: [
        {
          div: [
            {
              div: (listener: any) => {
                trigger.get(listener);
                if (throwNext) throw new Error("oops");
                return [];
              },
            },
          ],
          $: [errorBoundary()],
        },
      ],
    } as any);

    throwNext = true;
    trigger.set(true);
    flushSync();

    expect(host.textContent).toContain("An error occurred.");
  });

  it("does not interfere when no error occurs", () => {
    const trigger = toState(0);
    const { host } = render({
      div: [
        {
          div: [
            {
              div: (listener: any) => [String(trigger.get(listener))],
            },
          ],
          $: [errorBoundary({ fallback: { p: "Nope" } })],
        },
      ],
    } as any);

    trigger.set(42);
    flushSync();

    expect(host.textContent).toContain("42");
    expect(host.querySelector("p")).toBeNull();
  });
});
