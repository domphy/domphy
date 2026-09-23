// @vitest-environment jsdom
// M10: constructing an ElementNode for generateCSS/generateHTML used to
// subscribe StyleProperty listeners to long-lived States and never release
// them (SSR trees are discarded without remove()).
import { afterEach, describe, expect, it } from "vitest";
import type { DomphyElement } from "../src/index.ts";
import { ElementNode, flushSync, toState } from "../src/index.ts";

function listenerCount(source: {
  _notifier?: { _listeners?: Record<string, Set<unknown>> };
}): number {
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

  it("untracked resolve still supplies elementNode for tag-dependent styles", () => {
    const App = {
      h1: "Title",
      style: {
        fontSize: (listener: { elementNode: { tagName: string } }) =>
          listener.elementNode.tagName === "h1" ? "2em" : "1em",
      },
    };
    expect(() =>
      new ElementNode(App as DomphyElement).generateCSS(),
    ).not.toThrow();
    expect(new ElementNode(App as DomphyElement).generateCSS()).toContain(
      "font-size: 2em",
    );
  });

  it("live render still updates the CSSOM when the state changes", () => {
    const color = toState("red", "live-color");
    const { host } = mount({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement);

    expect(listenerCount(color)).toBe(1);

    // Read the rule that currently styles the element, not a captured one: a
    // node whose declarations change leaves the shared content scope for its
    // own class, so the CSSOM rule backing it is not guaranteed to be the same
    // object across an update. What must hold is that the LIVE stylesheet
    // shows the new value for this element.
    const liveColor = (): string | undefined => {
      const styleEl =
        document.head.querySelector<HTMLStyleElement>("#domphy-style")!;
      const element = host.querySelector("div")!;
      const rules = Array.from(styleEl.sheet?.cssRules ?? []).filter((r) =>
        element.matches((r as CSSStyleRule).selectorText ?? ":not(*)"),
      ) as CSSStyleRule[];
      return rules[rules.length - 1]?.style.color;
    };

    expect(liveColor()).toBe("red");
    color.set("green");
    flushSync();
    expect(liveColor()).toBe("green");
  });
});
