// @vitest-environment jsdom
// M10: constructing an ElementNode for generateCSS/generateHTML used to
// subscribe StyleProperty listeners to long-lived States and never release
// them (SSR trees are discarded without remove()).
import { afterEach, describe, expect, it } from "vitest";
import {
  ElementNode,
  flushSync,
  toState,
} from "../src/index.ts";
import type { DomphyElement } from "../src/index.ts";

function listenerCount(source: { _notifier?: { _listeners?: Record<string, Set<unknown>> } }): number {
  const listeners = source._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("StyleProperty.set: generateCSS/HTML does not leak subscriptions", () => {
  it("leaves no State listeners after generateCSS", () => {
    const color = toState("red", "gen-css-color");
    const css = new ElementNode({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement).generateCSS();

    expect(css).toContain("color: red");
    expect(listenerCount(color)).toBe(0);
  });

  it("leaves no State listeners after generateHTML", () => {
    const color = toState("blue", "gen-html-color");
    const html = new ElementNode({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement).generateHTML();

    expect(html).toContain("<div");
    expect(listenerCount(color)).toBe(0);
  });

  it("live render still updates the CSSOM when the state changes", () => {
    const color = toState("red", "live-color");
    const { host } = mount({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement);

    expect(listenerCount(color)).toBe(1);

    const styleEl =
      document.head.querySelector<HTMLStyleElement>("#domphy-style")!;
    const token = Array.from(host.querySelector("div")!.classList).find((c) =>
      /_[a-z0-9]+$/i.test(c),
    );
    const rule = Array.from(styleEl.sheet?.cssRules ?? []).find(
      (r) => (r as CSSStyleRule).selectorText === `.${token}`,
    ) as CSSStyleRule;

    expect(rule.style.color).toBe("red");
    color.set("green");
    flushSync();
    expect(rule.style.color).toBe("green");
  });
});
