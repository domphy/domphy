// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
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

    const styleEl =
      document.head.querySelector<HTMLStyleElement>("#domphy-style")!;
    expect(styleEl).toBeTruthy();

    const rules = Array.from(styleEl.sheet?.cssRules ?? []) as CSSStyleRule[];
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

// Expected value = the CSSOM's own state. A duplicated `[hidden]` rule is a
// defect regardless of how many times ensureDomStyle() is called, and the
// guard added for the null-sheet case (a <style> in a shadow root whose host
// is still detached — Chromium 141 returns `sheet === null` there) must not
// turn into repeated insertion once a sheet does exist.
describe("ensureDomStyle: the base rule is inserted exactly once", () => {
  it("repeated calls leave a single [hidden] rule in the sheet", async () => {
    const { ensureDomStyle } = await import("../src/helpers.ts");
    const style = ensureDomStyle(document.head);
    ensureDomStyle(document.head);
    ensureDomStyle(document.head);
    const rules = [...(style.sheet as CSSStyleSheet).cssRules];
    expect(
      rules.filter((rule) => rule.cssText.includes("[hidden]")).length,
    ).toBe(1);
  });
});

// Truth source: real jsdom CSSOM behavior. Unlike a <style> appended to
// `document.head` (connected immediately, sheet built synchronously), jsdom
// DOES reproduce `sheet === null` for a <style> inside a shadow root whose
// host was never attached to the document — verified empirically, so this
// half needs no stub at all.
describe("ensureDomStyle: retries the base rule once the sheet becomes available", () => {
  it("does not mark domphyBase done while the shadow host is detached (real jsdom null sheet)", async () => {
    const { ensureDomStyle } = await import("../src/helpers.ts");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" }); // host never joins the document

    const style = ensureDomStyle(shadow);
    expect(style.sheet).toBeNull();
    expect(style.dataset.domphyBase).toBeUndefined();

    // A second call while still detached must not throw and must still leave
    // the base rule unmarked, ready to retry.
    expect(() => ensureDomStyle(shadow)).not.toThrow();
    expect(style.dataset.domphyBase).toBeUndefined();
  });

  it("inserts the base rule exactly once the sheet appears, and never again after", async () => {
    const { ensureDomStyle } = await import("../src/helpers.ts");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });

    const style = ensureDomStyle(shadow);
    expect(style.dataset.domphyBase).toBeUndefined();

    // jsdom never reconstructs a sheet once the host later attaches to the
    // document (verified: it stays null even after `document.body.append
    // (host)`), so the "sheet arrives later" transition itself — which is
    // real, documented CSSOM behavior in Chromium — is stubbed onto the same
    // element the retry path actually reads. Everything else in this test
    // (the base-rule guard, the dataset flag, the CSSOM insertion) is real.
    const probe = document.createElement("style");
    document.body.appendChild(probe);
    Object.defineProperty(style, "sheet", {
      value: probe.sheet,
      configurable: true,
    });
    document.body.removeChild(probe);

    const again = ensureDomStyle(shadow);
    expect(again).toBe(style);
    expect(style.dataset.domphyBase).toBe("true");
    const rules = [...(style.sheet as CSSStyleSheet).cssRules];
    expect(
      rules.filter((rule) => rule.cssText.includes("[hidden]")).length,
    ).toBe(1);

    // A further call must not insert the base rule a second time.
    ensureDomStyle(shadow);
    const rulesAfter = [...(style.sheet as CSSStyleSheet).cssRules];
    expect(
      rulesAfter.filter((rule) => rule.cssText.includes("[hidden]")).length,
    ).toBe(1);
  });
});

// Truth source: real jsdom CSSOM (same detached-shadow-root null-sheet
// behavior as above). Before the fix, StyleList.render() called
// `dom.sheet!.insertRule` unconditionally, so every one of a node's rules
// threw into StyleRule.render()'s own try/catch and warned independently —
// two declared rules meant two identical "Failed to insert rule" warnings
// instead of one clear cause.
describe("StyleList.render: a <style> with no sheet gives one clear diagnostic", () => {
  it("warns once (not once per rule) and never throws when the shadow host is never attached", () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" }); // stays detached

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const node = new ElementNode({
      div: "x",
      style: { color: "red", "&:hover": { color: "blue" } },
    } as DomphyElement);

    expect(() => node.render(shadow as unknown as HTMLElement)).not.toThrow();

    const styleEl = shadow.querySelector<HTMLStyleElement>("#domphy-style");
    expect(styleEl?.sheet).toBeNull();

    const failedInsertWarnings = warnSpy.mock.calls.filter((args) =>
      String(args[0]).includes("Failed to insert rule"),
    );
    expect(failedInsertWarnings).toHaveLength(0);

    const noSheetWarnings = warnSpy.mock.calls.filter((args) =>
      String(args[0]).includes("has no CSS sheet"),
    );
    expect(noSheetWarnings).toHaveLength(1);

    warnSpy.mockRestore();
  });
});
