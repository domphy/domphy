// @vitest-environment jsdom
/**
 * Command-palette filtering.
 *
 * Truth source: a real Chromium run of the palette (Playwright, 2026-09-23).
 * Typing "open" into the search field left ZERO items visible even though two
 * items were literally named "Open file" and "Open folder" — `commandItem`
 * captured `el.textContent` inside `_onMount`, which fires before the child
 * text node is attached, so every item filtered against the empty string.
 */

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { command, commandItem, commandSearch } from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

function renderPalette() {
  const { host } = render({
    div: [
      { input: null, ariaLabel: "Search commands", $: [commandSearch()] },
      { button: "Open file", $: [commandItem()] },
      { button: "Open folder", $: [commandItem()] },
      { button: "Close window", $: [commandItem()] },
    ],
    $: [command()],
  } as DomphyElement);
  flushSync();
  const input = host.querySelector("input") as HTMLInputElement;
  const visible = () =>
    (Array.from(host.querySelectorAll("button")) as HTMLElement[])
      .filter((el) => !el.hidden)
      .map((el) => el.textContent);
  return { host, input, visible };
}

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  flushSync();
}

describe("command palette filtering", () => {
  it("keeps the items whose label matches the query", () => {
    const { input, visible } = renderPalette();
    expect(visible()).toEqual(["Open file", "Open folder", "Close window"]);
    type(input, "open");
    expect(visible()).toEqual(["Open file", "Open folder"]);
    type(input, "window");
    expect(visible()).toEqual(["Close window"]);
    type(input, "");
    expect(visible()).toHaveLength(3);
  });

  // cmdk / shadcn Command parity: the result list is walkable from the search
  // field, and only the currently visible rows take part.
  it("ArrowDown walks only the visible results, Enter runs one", () => {
    const { host, input, visible } = renderPalette();
    type(input, "open");
    expect(visible()).toHaveLength(2);

    let ran = "";
    for (const button of Array.from(host.querySelectorAll("button"))) {
      button.addEventListener("click", () => {
        ran = button.textContent ?? "";
      });
    }
    const press = (target: EventTarget, key: string) =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );

    input.focus();
    press(input, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("Open file");
    press(document.activeElement!, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("Open folder");
    // Wraps past the last VISIBLE item — "Close window" is filtered out.
    press(document.activeElement!, "ArrowDown");
    expect(document.activeElement?.textContent).toBe("Open file");
    press(document.activeElement!, "Enter");
    expect(ran).toBe("Open file");
  });
});
