// @vitest-environment jsdom
// Production-readiness regression coverage (runtime-reproduced audit findings):
//  C1 selectItem loses selection + click after any ancestor re-render
//  H1 popover aria-controls/id wiring dead (never set, stripped by patch)
//  H2 tooltip ARIA id from Math.random() — generation churn / SSR hazard
//  H3 dialog close-finalization split across generations (closing flag read
//     by the wrong generation's onTransitionEnd → always the 350ms fallback)
// plus the additive exports (focusRing/elevation/grid/visuallyHidden,
// inputText({ type })) and toast overlay teardown.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dialog,
  elevation,
  focusRing,
  grid,
  inputText,
  popover,
  selectItem,
  selectList,
  toast,
  tooltip,
  visuallyHidden,
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
  (HTMLDialogElement.prototype as any).showModal = function () {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function () {
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

describe("C1: selectItem survives ancestor re-render", () => {
  it("aria-selected persists and clicks still toggle after the parent re-renders", () => {
    const refresh = toState(0);
    // Caller-owned selection state — the same object across generations, so
    // "persists" is well-defined (a default per-generation state is the M2
    // context-recreation topic, out of scope here).
    const value = toState<string | null>(null);
    const { host } = render({
      div: (l: any) => {
        refresh.get(l);
        return [
          {
            div: [
              { div: "Option A", $: [selectItem({ value: "a" })] },
              { div: "Option B", $: [selectItem({ value: "b" })] },
            ],
            $: [selectList({ value })],
          },
        ];
      },
    } as DomphyElement);

    const [itemA] = Array.from(
      host.querySelectorAll<HTMLElement>("[role=option]"),
    );
    itemA.click();
    flushSync();
    expect(itemA.getAttribute("aria-selected")).toBe("true");

    // Ancestor re-render: fresh selectItem()/selectList() closures on the
    // SAME reused DOM nodes. patch() resets _events and strips undeclared
    // attributes — the old _onInit wiring died right here.
    refresh.set(1);
    flushSync();

    const [itemA2, itemB2] = Array.from(
      host.querySelectorAll<HTMLElement>("[role=option]"),
    );
    expect(itemA2.getAttribute("aria-selected")).toBe("true");
    expect(itemB2.getAttribute("aria-selected")).toBe("false");

    // Clicks still toggle after the re-render (single select: clicking a
    // different option moves the selection).
    itemB2.click();
    flushSync();
    expect(itemB2.getAttribute("aria-selected")).toBe("true");
    expect(itemA2.getAttribute("aria-selected")).toBe("false");
    expect(value.get()).toBe("b");
  });
});

describe("H1: popover id / aria-controls wiring", () => {
  it("aria-controls is present from first render, before the panel's first show()", () => {
    const { host } = render({
      div: [{ button: "Open", $: [popover({ content: { div: "Body" } })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    const controls = btn.getAttribute("aria-controls");
    expect(controls).toMatch(/^domphy-popover-/);
  });

  it("aria-controls matches the mounted panel's id, and survives a re-render", () => {
    vi.useFakeTimers();
    const refresh = toState(0);
    // The reactive list is nested inside a STATIC outer div: the floating
    // overlay is inserted as a child of the app ROOT, so this keeps the panel
    // out of the reactive node's own reconciliation (same test shape as
    // popover-rerender-repro.test.ts).
    const { host } = render({
      div: [
        {
          div: (l: any) => {
            refresh.get(l);
            return [
              {
                button: "Open",
                $: [popover({ content: { div: [{ button: "Inside" }] } })],
              },
            ];
          },
        },
      ],
    } as DomphyElement);

    refresh.set(1);
    flushSync();

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();

    const panel = document.querySelector<HTMLElement>("[role=dialog]");
    expect(panel).not.toBeNull();
    expect(panel!.id).toBe(btn.getAttribute("aria-controls"));

    // Re-render while open: the DOM-stamped panel id survives the in-place
    // panel patch (it was never in the attribute bookkeeping), and the
    // re-declared aria-controls still matches.
    refresh.set(2);
    flushSync();
    const btn2 = host.querySelector("button")!;
    expect(btn2.getAttribute("aria-controls")).toBe(panel!.id);
    expect(document.getElementById(panel!.id)).toBe(panel);
  });

  it("tabbing from the trigger INTO the panel does not close the popover after a re-render", () => {
    vi.useFakeTimers();
    const refresh = toState(0);
    // Caller-owned open state — the same object across generations, so the
    // re-render does not reset the visible state (that reset is the
    // documented no-caller-state behavior, not the bug under test).
    const open = toState(false);
    // Static-outer-div shape — see the test above.
    const { host } = render({
      div: [
        {
          div: (l: any) => {
            refresh.get(l);
            return [
              {
                button: "Open",
                $: [
                  popover({ open, content: { div: [{ button: "Inside" }] } }),
                ],
              },
            ];
          },
        },
      ],
    } as DomphyElement);

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");

    // Fresh generation on the same reused trigger — the old factory-scope
    // popoverId was null here, so the onBlur guard fell through and closed.
    refresh.set(1);
    flushSync();

    const inside = document.querySelector<HTMLElement>("[role=dialog] button")!;
    host
      .querySelector("button")!
      .dispatchEvent(new FocusEvent("blur", { relatedTarget: inside }));
    vi.advanceTimersByTime(150);
    flushSync();
    expect(host.querySelector("button")!.getAttribute("aria-expanded")).toBe(
      "true",
    );
  });
});

describe("H2: tooltip id is deterministic", () => {
  it("aria-describedby is stable across generations (no Math.random churn)", () => {
    // Caller-owned open state (not the hover/focus debounce path): stays
    // open across the ancestor re-renders below, so this isolates id
    // stability from the separate (pre-existing, unrelated to this test)
    // uncontrolled-state visual-reset-on-refresh behavior covered by
    // popover-rerender-repro.test.ts.
    const refresh = toState(0);
    const open = toState(true);
    const { host } = render({
      div: (l: any) => {
        refresh.get(l);
        return [{ button: "Hover", $: [tooltip({ content: "Tip", open })] }];
      },
    } as DomphyElement);
    flushSync();

    const before = host
      .querySelector("button")!
      .getAttribute("aria-describedby");
    expect(before).toMatch(/^domphy-tooltip-/);

    refresh.set(1);
    flushSync();
    refresh.set(2);
    flushSync();
    expect(host.querySelector("button")!.getAttribute("aria-describedby")).toBe(
      before,
    );
  });

  it("aria-describedby matches the mounted tooltip panel's id", () => {
    vi.useFakeTimers();
    const { host } = render({
      div: [{ button: "Hover", $: [tooltip({ content: "Tip" })] }],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.dispatchEvent(new Event("mouseenter"));
    vi.advanceTimersByTime(150);
    flushSync();
    const panel = document.querySelector<HTMLElement>("[role=tooltip]");
    expect(panel).not.toBeNull();
    expect(panel!.id).toBe(btn.getAttribute("aria-describedby"));
  });
});

describe("H3: dialog close-finalization after ancestor re-render", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.runAllTimers());

  it("transitionend finalizes the close IMMEDIATELY (no 350ms fallback) after re-renders", () => {
    const refresh = toState(0);
    const open = toState(false);
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.appendChild(trigger);
    trigger.focus();
    const focusSpy = vi.spyOn(trigger, "focus");

    const { host } = render({
      div: (l: any) => {
        refresh.get(l);
        return [
          {
            dialog: [{ button: "Confirm" }],
            $: [dialog({ open })],
          },
        ];
      },
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;

    // Drain the mount-time close fallback (the dialog mounts closed, so
    // attach runs the close path once) BEFORE opening — same shape as the
    // existing dialog tests.
    vi.runAllTimers();
    open.set(true);
    flushSync();
    expect(dlg.style.visibility).toBe("visible");
    focusSpy.mockClear();

    // Multiple generations on the same reused dialog node — the old code set
    // gen-1's `closing` while the live gen-N onTransitionEnd read gen-N's
    // (false) flag and early-returned.
    for (let i = 1; i <= 3; i++) {
      refresh.set(i);
      flushSync();
    }

    open.set(false);
    flushSync();

    const transitionEnd = new Event("transitionend", { bubbles: true });
    Object.assign(transitionEnd, { propertyName: "opacity" });
    dlg.dispatchEvent(transitionEnd);

    // Immediate finalization — no timer advance.
    expect(dlg.style.visibility).toBe("hidden");
    expect(dlg.style.pointerEvents).toBe("none");
    expect(focusSpy).toHaveBeenCalled();
  });

  it("still opens and closes via the caller-owned state across re-renders", () => {
    const refresh = toState(0);
    const open = toState(false);
    const { host } = render({
      div: (l: any) => {
        refresh.get(l);
        return [{ dialog: [{ button: "X" }], $: [dialog({ open })] }];
      },
    } as DomphyElement);
    const dlg = host.querySelector("dialog") as HTMLDialogElement;

    refresh.set(1);
    flushSync();
    open.set(true);
    flushSync();
    expect(dlg.style.visibility).toBe("visible");
    expect(document.body.style.overflow).toBe("hidden");

    refresh.set(2);
    flushSync();
    open.set(false);
    flushSync();
    vi.runAllTimers();
    expect(dlg.style.visibility).toBe("hidden");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("additive exports", () => {
  it("exports focusRing and elevation helpers", () => {
    expect(typeof focusRing).toBe("function");
    expect(typeof elevation).toBe("function");
    expect(elevation("low")).toContain("rgba");
    expect(elevation("medium")).not.toBe(elevation("high"));
  });

  it("inputText({ type }) sets the given type and no longer stomps a native type", () => {
    const { host } = render({
      div: [
        { input: null, $: [inputText({ type: "email" })] },
        // Native declaration wins over the patch default (core rule).
        { input: null, type: "url", $: [inputText()] },
      ],
    } as DomphyElement);
    const inputs = host.querySelectorAll("input");
    expect(inputs[0].getAttribute("type")).toBe("email");
    expect(inputs[1].getAttribute("type")).toBe("url");
  });

  it("grid() lays out a themed grid", () => {
    const { node } = render({
      div: [{ div: "A" }, { div: "B" }],
      $: [grid({ columns: 2, gap: 2 })],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("display: grid");
  });

  it("visuallyHidden() applies the sr-only recipe", () => {
    const { node } = render({
      div: [{ span: "Screen reader only", $: [visuallyHidden()] }],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("position: absolute");
    expect(css).toContain("width: 1px");
    expect(css).toContain("clip: rect(0, 0, 0, 0)");
  });
});

describe("toast overlay teardown", () => {
  it("removes the position overlay once its last toast is gone", () => {
    vi.useFakeTimers();
    const show = toState(true);
    const { node } = render({
      div: [
        {
          div: (l: any) =>
            show.get(l)
              ? [
                  {
                    div: "Msg",
                    // duration: Infinity — this test's concern is manual-removal
                    // teardown, not auto-dismiss; runAllTimers() below must only
                    // settle the exit-animation fallback timer.
                    $: [toast({ position: "top-right", duration: Infinity })],
                  },
                ]
              : [],
        },
      ],
    } as DomphyElement);
    void node;
    expect(document.getElementById("domphy-toast-top-right")).not.toBeNull();

    show.set(false);
    flushSync();
    // Exit animation settles via the 350ms fallback timer (jsdom fires no
    // transitionend), then the empty overlay must be removed too.
    vi.runAllTimers();
    expect(document.getElementById("domphy-toast-top-right")).toBeNull();
  });

  it("keeps the shared overlay while another toast at the same position remains", () => {
    vi.useFakeTimers();
    const showFirst = toState(true);
    render({
      div: [
        {
          div: (l: any) =>
            showFirst.get(l)
              ? [
                  {
                    div: "First",
                    // duration: Infinity — same reasoning as the sibling test
                    // above: isolate teardown from auto-dismiss timing.
                    $: [toast({ position: "top-right", duration: Infinity })],
                  },
                ]
              : [],
        },
        {
          div: "Second",
          $: [toast({ position: "top-right", duration: Infinity })],
        },
      ],
    } as DomphyElement);
    expect(document.getElementById("domphy-toast-top-right")).not.toBeNull();

    showFirst.set(false);
    flushSync();
    vi.runAllTimers();
    expect(document.getElementById("domphy-toast-top-right")).not.toBeNull();
  });
});

describe("toast auto-dismiss", () => {
  // toast()'s own JSDoc contract (src/patches/toast.ts): "Auto-dismisses
  // after `duration` ..., paused while hovered or focused." The behavior()
  // instance that implements this was previously never wired into the
  // returned element (dead code — the `_attachAutoDismiss` function was
  // defined but never called), so `duration`/`onDismiss` were accepted and
  // silently ignored. These assert the documented contract end to end
  // against real timers and real DOM events, not the implementation's own
  // internals.
  it("removes itself and calls onDismiss after duration elapses", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render({
      div: [{ div: "Saved", $: [toast({ duration: 1000, onDismiss })] }],
    } as DomphyElement);
    expect(document.getElementById("domphy-toast-top-center")).not.toBeNull();

    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss while duration is Infinity", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render({
      div: [{ div: "Pinned", $: [toast({ duration: Infinity, onDismiss })] }],
    } as DomphyElement);
    vi.advanceTimersByTime(60_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("pauses the countdown on pointerenter and resumes on pointerleave", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const { node } = render({
      div: [{ div: "Hoverable", $: [toast({ duration: 1000, onDismiss })] }],
    } as DomphyElement);
    const toastElement = node.domElement!.querySelector(
      '[role="status"]',
    ) as HTMLElement;
    expect(toastElement).not.toBeNull();

    vi.advanceTimersByTime(800);
    toastElement.dispatchEvent(new Event("pointerenter", { bubbles: true }));
    // Paused: the remaining 200ms never elapses while hovered.
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).not.toHaveBeenCalled();

    toastElement.dispatchEvent(new Event("pointerleave", { bubbles: true }));
    // Resumed with the ~200ms that was remaining when paused.
    vi.advanceTimersByTime(200);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
