// @vitest-environment jsdom
/**
 * Selection widgets that publish their value through `_context`.
 *
 * Truth source: the Domphy element contract itself — `ElementNode.patch()`
 * re-merges `element._context` into the live node on every re-render
 * (packages/core/src/classes/ElementNode.ts), and `merge()` lets the incoming
 * value win. A partial that DECLARES `_context: { x: { value: toState(...) } }`
 * therefore publishes a brand-new State per factory generation, so what a
 * descendant reads is not the state the widget's own buttons write to.
 * These tests assert the published state and the rendered ARIA state agree.
 */

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  segmented,
  selectItem,
  selectList,
  toggleGroup,
} from "../src/index.ts";

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

describe("segmented published context", () => {
  it("tracks the real selection, and survives an ancestor re-render", () => {
    const tick = toState(0);
    let published: { get(): string } | null = null;
    const { host } = render({
      div: (listener) => {
        tick.get(listener);
        return [
          {
            div: null,
            _key: "seg",
            $: [
              segmented({
                items: [
                  { label: "A", key: "a" },
                  { label: "B", key: "b" },
                ],
              }),
            ],
            _onMount: (node: ElementNode) => {
              published = node.getContext("segmented").value;
            },
          },
        ];
      },
    } as DomphyElement);
    flushSync();

    const radios = () =>
      Array.from(host.querySelectorAll("[role=radio]")) as HTMLElement[];
    expect(published!.get()).toBe("a");

    radios()[1]!.click();
    flushSync();
    expect(radios()[1]!.getAttribute("aria-checked")).toBe("true");
    expect(published!.get()).toBe("b");

    tick.set(1);
    flushSync();
    expect(radios()[1]!.getAttribute("aria-checked")).toBe("true");
    expect(published!.get()).toBe("b");
  });
});

describe("toggleGroup published context", () => {
  it("tracks the real pressed set", () => {
    let published: { get(): string | string[] } | null = null;
    const { host } = render({
      div: null,
      $: [
        toggleGroup({
          multiple: true,
          items: [
            { label: "Bold", key: "bold" },
            { label: "Italic", key: "italic" },
          ],
        }),
      ],
      _onMount: (node: ElementNode) => {
        published = node.getContext("toggleGroup").value;
      },
    } as DomphyElement);
    flushSync();

    const buttons = Array.from(host.querySelectorAll("button"));
    buttons[1]!.click();
    flushSync();
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(published!.get()).toEqual(["italic"]);
  });
});

describe("selectList published context", () => {
  it("keeps the uncontrolled selection across an ancestor re-render", () => {
    const tick = toState(0);
    const { host } = render({
      div: (listener) => {
        tick.get(listener);
        return [
          {
            div: [
              { div: "A", $: [selectItem({ value: "a" })] },
              { div: "B", $: [selectItem({ value: "b" })] },
            ],
            _key: "list",
            $: [selectList()],
          },
        ];
      },
    } as DomphyElement);
    flushSync();

    const options = () =>
      Array.from(host.querySelectorAll("[role=option]")) as HTMLElement[];
    options()[1]!.click();
    flushSync();
    expect(options()[1]!.getAttribute("aria-selected")).toBe("true");

    tick.set(1);
    flushSync();
    expect(options()[1]!.getAttribute("aria-selected")).toBe("true");
  });
});
