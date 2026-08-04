// @vitest-environment jsdom

// Regression tests for the reused-node lifecycle gotcha (AGENTS.md): the
// Ctrl/Cmd+B sidebar hotkey used to be wired in `_onMount`, which runs ONCE
// per real DOM node — after any ancestor re-render the listener kept calling
// generation 1's disconnected collapse state and the hotkey silently died.
// The fix declares the hotkey via `behavior()` (sidebarHotkey.ts), so later
// generations route their fresh `onToggle` into the same instance.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sidebar07 } from "../../../src/shadcn/sidebar/sidebar07.ts";
import { sidebar08 } from "../../../src/shadcn/sidebar/sidebar08.ts";

vi.setConfig({ testTimeout: 20000 });

function renderInReactiveParent(factory: () => DomphyElement) {
  const refresh = toState(0);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode({
    div: [
      {
        div: (listener: unknown) => {
          (refresh.get as (l: unknown) => number)(listener);
          return [factory()];
        },
      },
    ],
  } as DomphyElement);
  node.render(host);
  flushSync();
  return { host, node, refresh };
}

function pressCtrlB() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "b",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  flushSync();
}

// Domphy compiles reactive styles into generated classes and mutates the
// CSSOM rule text on state change — the collapse flip is observable as the
// `width:` declaration inside the aside's generated rule.
function widthDeclaration(element: HTMLElement): string {
  const className = element.getAttribute("class") ?? "";
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule.cssText.includes(className) && rule.cssText.includes("width")) {
        const match = /width:\s*([^;]+);/.exec(rule.cssText);
        if (match) return match[1];
      }
    }
  }
  throw new Error(`no width rule found for .${className}`);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sidebar collapse hotkey — reused-node lifecycle", () => {
  it("sidebar07: Ctrl+B still collapses after an ancestor re-render reuses the aside", () => {
    const { host, refresh } = renderInReactiveParent(
      () => sidebar07() as DomphyElement,
    );
    const aside = host.querySelector("aside") as HTMLElement;
    const expandedWidth = widthDeclaration(aside);

    // Ancestor re-render: fresh factory closure, SAME DOM node.
    refresh.set(1);
    flushSync();
    const reusedAside = host.querySelector("aside") as HTMLElement;
    expect(reusedAside).toBe(aside);

    pressCtrlB();
    expect(widthDeclaration(aside)).not.toBe(expandedWidth);
    const collapsedWidth = widthDeclaration(aside);

    // A further re-render starts a fresh generation (state resets to
    // expanded) — and the hotkey must still drive THAT generation.
    refresh.set(2);
    flushSync();
    expect(widthDeclaration(aside)).toBe(expandedWidth);
    pressCtrlB();
    expect(widthDeclaration(aside)).toBe(collapsedWidth);
  });

  it("sidebar08: Ctrl+B still collapses after an ancestor re-render reuses the aside", () => {
    const { host, refresh } = renderInReactiveParent(
      () => sidebar08() as DomphyElement,
    );
    const aside = host.querySelector("aside") as HTMLElement;
    const expandedWidth = widthDeclaration(aside);

    refresh.set(1);
    flushSync();
    expect(host.querySelector("aside")).toBe(aside);

    pressCtrlB();
    expect(widthDeclaration(aside)).not.toBe(expandedWidth);
  });
});
