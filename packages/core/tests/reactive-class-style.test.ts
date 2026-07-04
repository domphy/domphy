// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

// Regression: a reactive `class: (listener) => string` on the same element as
// a `style: {}` object used to silently orphan that style. The constructor
// always seeds the "class" attribute with an auto-generated per-node token
// (`${tagName}_${nodeId}`) that the CSS-in-JS `style` rule is scoped to.
// ElementNode.merge()/patch() special-cased only a STATIC string `class` to
// MERGE onto that token (via AttributeList.addClass); a function fell through
// to a plain `.set()` that REPLACED the whole attribute, dropping the token —
// so the element's own style never reached the DOM even though the CSS rule
// existed in the stylesheet under the (now unused) token selector.

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

function autoClassToken(el: Element): string | undefined {
  return Array.from(el.classList).find((c) => /_[a-z0-9]+$/i.test(c));
}

function ruleFor(el: Element): CSSStyleRule | undefined {
  const styleEl = document.head.querySelector<HTMLStyleElement>("#domphy-style")!;
  const token = autoClassToken(el);
  return Array.from(styleEl.sheet?.cssRules ?? []).find(
    (r) => (r as CSSStyleRule).selectorText === `.${token}`,
  ) as CSSStyleRule | undefined;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("reactive `class` merges with (not replaces) the auto style class", () => {
  it("keeps the auto class token when `class` is a reactive function at construction", () => {
    const active = toState(true, "constructActive");
    const { host } = mount({
      div: "x",
      class: (l: any) => (active.get(l) ? "on" : "off"),
      style: { color: "red" },
    } as DomphyElement);

    const el = host.querySelector("div")!;
    expect(el.className).toContain("on");
    expect(autoClassToken(el)).toBeDefined();
    expect(ruleFor(el)?.style.color).toBe("red");
  });

  it("keeps applying the style after the reactive class value changes", async () => {
    const active = toState(true, "updateActive");
    const { host } = mount({
      div: "x",
      class: (l: any) => (active.get(l) ? "on" : "off"),
      style: { color: "blue" },
    } as DomphyElement);

    const el = host.querySelector("div")!;
    const token = autoClassToken(el);

    active.set(false);
    await flush();

    expect(el.className).toContain("off");
    expect(el.className).not.toContain("on");
    // The auto token — and thus the style rule scoped to it — must survive
    // every reactive re-evaluation of `class`, not just the first one.
    expect(autoClassToken(el)).toBe(token);
    expect(ruleFor(el)?.style.color).toBe("blue");
  });

  it("preserves the auto class and a reactive class through patch() reuse", async () => {
    const items = toState([{ id: 1, active: true }], "patchReactiveClass");
    const { host } = mount({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({
          li: "x",
          _key: it.id,
          class: () => (it.active ? "on" : "off"),
          style: { fontWeight: "bold" },
        })),
    } as DomphyElement);

    const li = host.querySelector("li")!;
    expect(li.className).toContain("on");
    const token = autoClassToken(li);
    expect(token).toBeDefined();
    expect(ruleFor(li)?.style.fontWeight).toBe("bold");

    items.set([{ id: 1, active: false }]); // same key -> patch() reuses the node
    await flush();

    expect(host.querySelector("li")).toBe(li); // reused, not recreated
    expect(li.className).toContain("off");
    expect(li.className).not.toContain("on");
    expect(autoClassToken(li)).toBe(token); // style-scoping token still present
    expect(ruleFor(li)?.style.fontWeight).toBe("bold");
  });

  it("keeps the auto class token when `class` is passed through as `undefined` (e.g. an unset optional prop)", () => {
    // Regression: `class: props.className` is a common pattern for an
    // element that wants to accept an optional caller class — but when the
    // caller doesn't pass one, `props.className` is `undefined`, not a
    // string/function. merge() used to fall through to the generic
    // `attributes.set("class", undefined)` branch for any non-string/function
    // value, which cleared the "class" attribute entirely — dropping the
    // auto-generated per-node token the element's own `style: {}` CSS rule is
    // scoped to, so the element rendered completely unstyled.
    const { host } = mount({
      div: "x",
      class: undefined,
      style: { color: "green" },
    } as DomphyElement);

    const el = host.querySelector("div")!;
    expect(autoClassToken(el)).toBeDefined();
    expect(ruleFor(el)?.style.color).toBe("green");
  });

  it("merges a reactive `class` with an already-present static class from a parent patch (`$`)", () => {
    const { host } = mount({
      div: "x",
      class: () => "reactive-part",
      $: [{ class: "patch-part", style: { display: "flex" } } as DomphyElement],
    } as DomphyElement);

    const el = host.querySelector("div")!;
    expect(el.className).toContain("reactive-part");
    expect(el.className).toContain("patch-part");
    expect(autoClassToken(el)).toBeDefined();
  });
});
