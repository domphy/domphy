// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  alert,
  drawer,
  errorBoundary,
  popover,
  toast,
  tooltip,
} from "../src/index.ts";

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
    (HTMLElement.prototype as any).close = function () {};
  }
});

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
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
// use fake timers to advance the 100ms show-debounce in creatFloating.
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
          { button: "Btn", $: [tooltip({ placement: "bottom", content: "Down" })] },
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
      div: [{ button: "Open", $: [popover({ content: { div: "Popover body" } })] }],
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
