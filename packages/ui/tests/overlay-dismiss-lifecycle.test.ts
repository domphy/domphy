// @vitest-environment jsdom
// Dismiss semantics for floating panels, measured against Radix's
// DismissableLayer + FocusScope and WAI-ARIA APG, then reproduced in real
// Chromium (scratchpad probes, 2026-09-23) before being pinned here.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { popover } from "../src/index.ts";

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

const OPEN_DELAY = 200;

function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode({
    div: [
      {
        button: "Trigger",
        class: "trigger",
        $: [
          popover({
            content: {
              div: [{ button: "Inside", class: "inside" }],
              class: "panel",
            },
          }),
        ],
      },
      { button: "Elsewhere", class: "elsewhere" },
    ],
  } as DomphyElement).render(host);
  const pick = <T extends HTMLElement>(selector: string) =>
    host.querySelector(selector) ?? (document.querySelector(selector) as T);
  const settle = () => {
    vi.advanceTimersByTime(OPEN_DELAY);
    flushSync();
  };
  const open = () => {
    (pick(".trigger") as HTMLElement).click();
    settle();
  };
  const panel = () => document.querySelector(".panel");
  return { host, pick, settle, open, panel };
}

const pressEscape = (target: EventTarget) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );

describe("floating panel dismissal", () => {
  it("outside click still dismisses on the SECOND open (Radix keeps a layer's dismiss wiring for the anchor's whole life, not the panel's)", () => {
    vi.useFakeTimers();
    const { pick, settle, open, panel } = mount();

    open();
    expect(panel()).not.toBeNull();
    (pick(".elsewhere") as HTMLElement).click();
    settle();
    expect(panel()).toBeNull();

    // The panel node carries a borrowed registration of the ANCHOR's behavior
    // instance; removing it used to destroy that instance, taking the
    // document-level outside-click listener with it.
    open();
    expect(panel()).not.toBeNull();
    (pick(".elsewhere") as HTMLElement).click();
    settle();
    expect(panel()).toBeNull();
  });

  it("Escape from inside the panel returns focus to the trigger (WAI-ARIA APG: Escape dismisses the popup and returns focus to the element that opened it)", () => {
    vi.useFakeTimers();
    const { pick, settle, open, panel } = mount();

    open();
    const inside = document.querySelector(".inside") as HTMLElement;
    inside.focus();
    expect(document.activeElement).toBe(inside);

    pressEscape(inside);
    settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(pick(".trigger"));
  });

  it("does not pull focus back when the dismissal came from the user moving focus elsewhere (Radix DismissableLayer leaves focus where the interaction put it)", () => {
    vi.useFakeTimers();
    const { pick, settle, open, panel } = mount();

    open();
    (document.querySelector(".inside") as HTMLElement).focus();
    const elsewhere = pick(".elsewhere") as HTMLElement;
    elsewhere.focus();
    elsewhere.click();
    settle();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(elsewhere);
  });
});
