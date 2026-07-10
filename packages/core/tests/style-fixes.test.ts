// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

// Sum of all listener-set sizes on a State's internal Notifier. Same helper as
// reactive-dispose.test.ts uses to assert a subscription was actually released.
function listenerCount(source: any): number {
  const listeners = source?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

// Regression: StyleList.addCSS's non-'&' branch for a selector nested inside
// another nested selector block (e.g. `.icon` inside `&:hover`) re-processed
// the already-fully-resolved selector text one level deeper instead of
// inserting it as a flat sibling rule -- producing malformed/duplicated CSS
// text, and (because StyleRule.render() never recurses into a plain
// selector's own styleList) the nested rule was silently dropped from the
// live stylesheet on client render entirely.
describe("StyleList.addCSS: doubly-nested non-'&' selector", () => {
  const element = {
    div: "x",
    style: {
      "&:hover": {
        color: "blue",
        ".icon": { opacity: "0.5" },
      },
    },
  } as DomphyElement;

  it("emits the nested selector as a single flat sibling rule (no duplication/malformed text)", () => {
    const css = new ElementNode(element).generateCSS();

    // The ".icon" selector text must appear exactly once, not nested inside
    // a duplicate copy of itself.
    const iconSelectorOccurrences = css.match(/:hover \.icon/g) ?? [];
    expect(iconSelectorOccurrences.length).toBe(1);

    expect(css).toContain("color: blue");
    expect(css).toContain("opacity: 0.5");

    // The old bug produced the selector text back-to-back with itself, e.g.
    // ".x:hover .icon {  .x:hover .icon { opacity: 0.5  }  }". That pattern
    // must not appear.
    expect(css).not.toMatch(/:hover \.icon\s*\{\s*[^{}]*:hover \.icon\s*\{/);
  });

  it("inserts the nested rule into the live stylesheet on a pure client render (no SSR)", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    new ElementNode(element).render(host);

    const styleEl = document.head.querySelector<HTMLStyleElement>(
      "#domphy-style",
    )!;
    expect(styleEl).toBeTruthy();

    const rules = Array.from(
      styleEl.sheet?.cssRules ?? [],
    ) as CSSStyleRule[];
    const iconRule = rules.find((r) => r.selectorText?.endsWith(".icon"));

    expect(iconRule).toBeDefined();
    expect(iconRule?.style.opacity).toBe("0.5");
  });
});

// Regression: StyleProperty kept only the LAST reactive subscription's release
// handle in a single `_release` variable, so a reactive style value reading
// MULTIPLE states in one evaluation (e.g. combining two coordinates into a
// `transform` string) leaked every subscription except the last one -- the
// earlier State(s) kept a live listener referencing the disposed
// StyleProperty's closure forever.
describe("StyleProperty: reactive value subscribing to multiple states", () => {
  it("releases every subscription (not just the last) when the node is removed", () => {
    const x = toState(0, "translateX");
    const y = toState(0, "translateY");

    const host = document.createElement("div");
    document.body.appendChild(host);

    const node = new ElementNode({
      div: "x",
      style: {
        transform: (l: any) => `translate(${x.get(l)}px, ${y.get(l)}px)`,
      },
    } as DomphyElement);
    node.render(host);

    expect(listenerCount(x)).toBe(1);
    expect(listenerCount(y)).toBe(1);

    node.remove();

    // Both subscriptions must be released, not just the one whose
    // onSubscribe fired last.
    expect(listenerCount(x)).toBe(0);
    expect(listenerCount(y)).toBe(0);
  });
});
