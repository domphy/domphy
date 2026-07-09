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
import { afterEach, describe, expect, it, vi } from "vitest";
import { popover } from "../src/index.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Each `it()` below calls vi.useFakeTimers() itself but none ever restores
// real timers, and none ever unmounts its own `host` from document.body —
// across the whole file that (a) leaves createFloating()'s setTimeout(
// instantShow/instantHide, 100) callbacks from an EARLIER test still pending
// against a shared fake clock when a LATER test starts advancing it, and (b)
// leaves the #domphy-floating overlay div — one per app root, a fixed,
// non-unique id BY DESIGN (a single shared overlay per root) — accumulating
// duplicates across the whole jsdom `document` once more than one test's
// root is mounted at once. jsdom's querySelector('#id') returns null (not
// just "first match") once an id collides document-wide, even when scoped to
// a specific host that DOES contain a matching descendant. Restore real
// timers AND wipe body between tests so each one starts clean.
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

describe("popover teardown when the anchor is removed while open (repro)", () => {
  it("removing the anchor while open removes the floating panel from the DOM (single render, no reuse — control case)", () => {
    vi.useFakeTimers();
    const items = toState([1]);
    // The reactive list lives INSIDE a stable outer div — matching real app
    // structure (a nested reactive list, e.g. a node collection body, under
    // a static app root) — not AS the root itself. createFloating() inserts
    // the #domphy-floating overlay as a child of the trigger's ROOT node; if
    // the list's own reactive div were the root, its OWN re-render would
    // wipe the overlay as an unrelated side effect of the test's shape, not
    // the bug under test.
    const { host } = render({
      div: [
        {
          div: (l: any) =>
            items.get(l).map((id: number) => ({
              div: [
                { button: `Open ${id}`, $: [popover({ content: { div: `Body ${id}` } })] },
              ],
              _key: id,
            })),
        },
      ],
    } as DomphyElement);

    host.querySelector("button")!.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(host.querySelector("#domphy-floating")!.textContent).toContain("Body 1");

    items.set([]);
    flushSync();
    expect(host.querySelector("#domphy-floating")!.textContent).not.toContain("Body 1");
  });

  it("removing the anchor after MULTIPLE reactive re-renders of its row still removes the CURRENTLY open floating panel", () => {
    // Reproduces the real bug: a node's settings popover (settingsButton() in
    // ParaShape's builder) is recreated fresh every time a SIBLING node
    // changes — a fresh popover()/createFloating() closure on the SAME reused
    // anchor DOM element each time. Opening the popover AFTER several such
    // re-renders means the LIVE closure is not the first one, so the
    // anchor's ONE-EVER BeforeRemove hook (registered by the first closure's
    // _onMount, which never re-fires on a reused node) used to tear down the
    // wrong (stale, never-shown) generation — leaving the actually-visible
    // floating panel orphaned in #domphy-floating when the row was removed.
    vi.useFakeTimers();
    const items = toState([1]);
    const refreshTrigger = toState(0);
    // Same stable-outer-div shape as the control case above — see its comment.
    const { host } = render({
      div: [
        {
          div: (l: any) => {
            refreshTrigger.get(l);
            return items.get(l).map((id: number) => ({
              div: [
                { button: `Open ${id}`, $: [popover({ content: { div: `Body ${id}` } })] },
              ],
              _key: id,
            }));
          },
        },
      ],
    } as DomphyElement);

    for (let i = 1; i <= 5; i++) {
      refreshTrigger.set(i);
      flushSync();
    }

    // Open via the LATEST (5th generation) closure — the one whose click
    // handler is actually live.
    host.querySelector("button")!.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(host.querySelector("#domphy-floating")!.textContent).toContain("Body 1");

    // Real removal (not just a value change) — the exact "Remove" action
    // from a node's settings menu.
    items.set([]);
    flushSync();
    expect(host.querySelector("#domphy-floating")!.textContent).not.toContain("Body 1");
  });
});
