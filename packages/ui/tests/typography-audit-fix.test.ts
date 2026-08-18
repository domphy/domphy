// @vitest-environment jsdom
//
// Catalog audit: typography-adjacent patches.
// H12 tag remove button needs Enter/Space; M31 removable flip on a reused
// node must insert/remove the button; M32/M33 essential nav uses the text
// tone (not muted); M34 code/mark/tag/keyboard/badge chrome multiplies
// themeDensity for padding/height/radius.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  badge,
  breadcrumb,
  breadcrumbEllipsis,
  code,
  keyboard,
  mark,
  tag,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function cssOf(app: DomphyElement): string {
  return new ElementNode(app).generateCSS();
}

function keydown(target: EventTarget, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function removeButton(tagEl: HTMLElement): HTMLElement | null {
  return tagEl.querySelector('[role="button"][aria-label="Remove"]');
}

/** First `calc(N em)` for a CSS property (themeSpacing output). */
function calcEm(css: string, property: string): number {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}:\\s*calc\\(([\\d.]+)em\\)`));
  return match ? Number.parseFloat(match[1]) : Number.NaN;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("H12 tag remove button keyboard", () => {
  it("removes the tag on Enter", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag({ removable: true })] }],
    } as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    const tagEl = container.querySelector(":scope > span") as HTMLElement;
    const button = removeButton(tagEl);
    expect(button).not.toBeNull();
    keydown(button!, "Enter");
    expect(container.querySelector(":scope > span")).toBeNull();
  });

  it("removes the tag on Space and prevents default scroll", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag({ removable: true })] }],
    } as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    const tagEl = container.querySelector(":scope > span") as HTMLElement;
    const event = keydown(removeButton(tagEl)!, " ");
    expect(event.defaultPrevented).toBe(true);
    expect(container.querySelector(":scope > span")).toBeNull();
  });

  it("does not remove the tag on an unrelated key", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag({ removable: true })] }],
    } as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    const tagEl = container.querySelector(":scope > span") as HTMLElement;
    keydown(removeButton(tagEl)!, "Escape");
    expect(container.querySelector(":scope > span")).not.toBeNull();
  });
});

describe("M31 tag removable flip on reused node", () => {
  function mountFlippable(initial: boolean) {
    const removable = toState(initial);
    const { host } = render({
      div: (listener: unknown) => [
        {
          span: "Label",
          $: [tag({ removable: removable.get(listener as never) })],
          _key: "chip",
        },
      ],
    } as DomphyElement);
    const tagEl = () =>
      (host.firstElementChild as HTMLElement | null) ??
      (host.querySelector("span") as HTMLElement);
    return {
      host,
      removable,
      tagEl,
      buttonCount: () =>
        host.querySelectorAll('[role="button"][aria-label="Remove"]').length,
    };
  }

  it("inserts the remove button when removable flips false → true", () => {
    const { buttonCount, removable } = mountFlippable(false);
    expect(buttonCount()).toBe(0);
    removable.set(true);
    flushSync();
    expect(buttonCount()).toBe(1);
  });

  it("removes the orphaned button when removable flips true → false", () => {
    const { buttonCount, removable } = mountFlippable(true);
    expect(buttonCount()).toBe(1);
    removable.set(false);
    flushSync();
    expect(buttonCount()).toBe(0);
  });

  it("does not stack extra buttons across several flips", () => {
    const { buttonCount, removable } = mountFlippable(false);
    removable.set(true);
    flushSync();
    removable.set(false);
    flushSync();
    removable.set(true);
    flushSync();
    expect(buttonCount()).toBe(1);
  });
});

describe("M32 breadcrumb essential nav uses text tone", () => {
  it("styles direct children at the text alias, not muted", () => {
    const css = cssOf({
      nav: [{ a: "Home" }, { a: "Library", ariaCurrent: "page" }],
      $: [breadcrumb()],
    } as DomphyElement);
    // muted → --neutral-8 (below AA for essential nav); text → --neutral-9.
    expect(css).toMatch(/var\(--neutral-9\)/);
    expect(css).not.toMatch(/var\(--neutral-8\)/);
  });
});

describe("M33 breadcrumbEllipsis trigger uses text tone", () => {
  it("styles the trigger at the text alias, not muted", () => {
    const css = cssOf({
      button: "…",
      $: [breadcrumbEllipsis()],
    } as DomphyElement);
    expect(css).toMatch(/color:\s*var\(--neutral-9\)/);
    expect(css).not.toMatch(/color:\s*var\(--neutral-8\)/);
  });
});

describe("M34 density-aware padding/height/radius", () => {
  function atDensity(app: DomphyElement, density: "decrease-2" | "increase-2") {
    return cssOf({
      div: [app],
      dataDensity: density,
    } as DomphyElement);
  }

  function expectDensityChrome(
    factory: () => DomphyElement,
    properties: string[],
  ) {
    const compact = atDensity(factory(), "decrease-2");
    const roomy = atDensity(factory(), "increase-2");
    for (const property of properties) {
      const compactValue = calcEm(compact, property);
      const roomyValue = calcEm(roomy, property);
      expect(compactValue, property).not.toBeNaN();
      expect(roomyValue, property).not.toBeNaN();
      expect(roomyValue, property).toBeGreaterThan(compactValue);
    }
  }

  it("code padding/height/radius grow with density", () => {
    expectDensityChrome(
      () => ({ code: "npm i", $: [code()] }) as DomphyElement,
      ["padding-inline", "height", "border-radius"],
    );
  });

  it("mark padding/height/radius grow with density", () => {
    expectDensityChrome(
      () => ({ mark: "important", $: [mark()] }) as DomphyElement,
      ["padding-inline", "height", "border-radius"],
    );
  });

  it("tag padding/height/radius grow with density", () => {
    expectDensityChrome(
      () => ({ span: "Label", $: [tag()] }) as DomphyElement,
      ["padding-inline-start", "height", "border-radius"],
    );
  });

  it("keyboard padding/radius grow with density", () => {
    expectDensityChrome(
      () => ({ kbd: "Ctrl", $: [keyboard()] }) as DomphyElement,
      ["padding-block", "padding-inline", "border-radius"],
    );
  });

  it("badge padding/height/radius grow with density", () => {
    expectDensityChrome(
      () => ({ span: "bell", $: [badge({ label: 3 })] }) as DomphyElement,
      ["padding-inline", "height", "border-radius"],
    );
  });
});
