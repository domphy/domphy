// @vitest-environment jsdom
// Regression coverage: a trigger's ancestor re-rendering (a fresh popover()
// call → a fresh createFloating() closure) used to leave show()/hide()
// permanently no-op, because `reference`/`rootNode` were only ever captured
// via anchorPartial's _onMount — which ElementNode.patch() correctly does
// NOT re-run on a reused (already-mounted) DOM node ("hooks already ran").
// Fixed by re-deriving `reference`/`rootNode` from the trigger's live event
// handlers (onClick/onMouseEnter/…), which DO get freshly rebound on every
// patch — see utils/floating.ts's `ensureReference`.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { describe, expect, it, vi } from "vitest";
import { popover } from "../src/index.ts";

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

describe("popover after reactive-parent re-render (repro)", () => {
  it("opens on first click, no re-render involved (control case)", () => {
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

  it("still opens on click AFTER an unrelated reactive re-render of its parent", () => {
    vi.useFakeTimers();
    const refreshTrigger = toState(0);
    const { host } = render({
      div: (l: any) => {
        refreshTrigger.get(l);
        return [
          { button: "Open", $: [popover({ content: { div: "Body" } })] },
        ];
      },
    } as DomphyElement);

    // Force the reactive parent to re-run BEFORE any user interaction —
    // this recreates the button element (and a FRESH internal popover()
    // call/openState/floating instance) via the SAME DOM node.
    refreshTrigger.set(1);
    flushSync();

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("still opens after MULTIPLE re-renders in a row", () => {
    vi.useFakeTimers();
    const refreshTrigger = toState(0);
    const { host } = render({
      div: (l: any) => {
        refreshTrigger.get(l);
        return [
          { button: "Open", $: [popover({ content: { div: "Body" } })] },
        ];
      },
    } as DomphyElement);

    for (let i = 1; i <= 5; i++) {
      refreshTrigger.set(i);
      flushSync();
    }

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("a CALLER-OWNED stable open state survives the re-render (still true immediately after), and toggling it still works", () => {
    vi.useFakeTimers();
    const refreshTrigger = toState(0);
    const open = toState(false); // owned by the caller, not recreated per render
    const { host } = render({
      div: (l: any) => {
        refreshTrigger.get(l);
        return [
          { button: "Open", $: [popover({ open, content: { div: "Body" } })] },
        ];
      },
    } as DomphyElement);

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");

    // Re-render WHILE open (e.g. an unrelated data update while a popover is
    // showing — very common in a live UI). The caller's `open` state is the
    // SAME object across instances, so it must still read "true" right away.
    refreshTrigger.set(1);
    flushSync();
    const btn2 = host.querySelector("button")!;
    expect(btn2.getAttribute("aria-expanded")).toBe("true");

    // The fresh (post-re-render) instance's own click handler must still be
    // able to close it — this is the exact mechanism the primary fix repairs.
    btn2.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn2.getAttribute("aria-expanded")).toBe("false");
  });

  it("with NO caller-owned state (fresh default per instance), a re-render mid-open visually resets to closed, and the fresh instance still opens on click", () => {
    vi.useFakeTimers();
    const refreshTrigger = toState(0);
    const { host } = render({
      div: (l: any) => {
        refreshTrigger.get(l);
        return [
          { button: "Open", $: [popover({ content: { div: "Body" } })] },
        ];
      },
    } as DomphyElement);

    const btn = host.querySelector("button")!;
    btn.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn.getAttribute("aria-expanded")).toBe("true");

    // Re-render mid-open with NO shared state → the fresh instance's own
    // default `open` starts false again (expected: the caller didn't ask for
    // continuity by passing a stable `open`).
    refreshTrigger.set(1);
    flushSync();
    const btn2 = host.querySelector("button")!;
    expect(btn2.getAttribute("aria-expanded")).toBe("false");

    // The important assertion: the fresh instance still actually WORKS.
    btn2.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(btn2.getAttribute("aria-expanded")).toBe("true");
  });
});
