// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

// Regression coverage for three confirmed bugs:
//
// 1. ElementAttribute's constructor kebab-cased every non-SVG multi-word
//    attribute name unconditionally, so contentEditable/maxLength/tabIndex
//    (whose real DOM attribute has no hyphen at all) rendered as
//    content-editable/max-length/tab-index — attributes the browser never
//    recognizes. Fixed via constants/HtmlAttributeNames.ts.
//
// 2. AttributeList.remove() called domElement.removeAttribute() with the raw
//    declared key instead of the ElementAttribute's canonical (possibly
//    kebab-cased) DOM name, so removing e.g. "ariaCurrent" left the real
//    "aria-current" attribute stuck on the element forever.
//
// 3. AttributeList.addClass()'s "current class is reactive" detection read
//    AttributeList.get("class"), which is always the last-RESOLVED primitive
//    string (ElementAttribute never exposes the raw function there) — so the
//    branch meant to keep an existing reactive `class` binding alive after an
//    addClass() call could never fire, silently freezing the class attribute.

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("multi-word HTML attribute names resolve to their real (unhyphenated) DOM spelling", () => {
  it("renders contentEditable/maxLength/tabIndex to the correct live DOM attributes", () => {
    const { host } = mount({
      div: [
        { input: null, maxLength: 5, tabIndex: 0 },
      ],
      contentEditable: true,
      tabIndex: 3,
    } as unknown as DomphyElement);

    const outer = host.querySelector("div")!;
    const input = host.querySelector("input")!;

    expect(outer.hasAttribute("contenteditable")).toBe(true);
    expect(outer.hasAttribute("content-editable")).toBe(false);

    expect(outer.getAttribute("tabindex")).toBe("3");
    expect(outer.hasAttribute("tab-index")).toBe(false);

    expect(input.getAttribute("maxlength")).toBe("5");
    expect(input.hasAttribute("max-length")).toBe(false);

    expect(input.getAttribute("tabindex")).toBe("0");
    expect(input.hasAttribute("tab-index")).toBe(false);
  });

  it("emits the same correct (unhyphenated) attribute names in SSR generateHTML()", () => {
    const node = new ElementNode({
      div: [{ input: null, maxLength: 5, tabIndex: 0 }],
      contentEditable: true,
      tabIndex: 3,
    } as unknown as DomphyElement);

    const html = node.generateHTML();

    expect(html).toContain("contenteditable");
    expect(html).not.toContain("content-editable");

    expect(html).toContain('tabindex="3"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toContain("tab-index");

    expect(html).toContain('maxlength="5"');
    expect(html).not.toContain("max-length");
  });

  it("still kebab-cases an unknown/custom camelCase attribute (e.g. a web-component prop), unaffected by the fix", () => {
    const { host } = mount({
      div: "x",
      myWidgetProp: "value",
    } as unknown as DomphyElement);

    const el = host.querySelector("div")!;
    expect(el.getAttribute("my-widget-prop")).toBe("value");
    expect(el.hasAttribute("mywidgetprop")).toBe(false);
  });
});

describe("AttributeList.remove() removes the real (canonical) DOM attribute", () => {
  it("remove(\"ariaCurrent\") actually removes aria-current from the live DOM", () => {
    const { host, node } = mount({
      a: "x",
      ariaCurrent: "page",
    } as unknown as DomphyElement);

    const el = host.querySelector("a")!;
    expect(el.getAttribute("aria-current")).toBe("page");

    node.attributes!.remove("ariaCurrent");

    expect(el.hasAttribute("aria-current")).toBe(false);
    expect(node.attributes!.has("ariaCurrent")).toBe(false);
  });

  it("dropping ariaCurrent via patch()'s stale-attribute cleanup also clears the real DOM attribute", () => {
    const { host, node } = mount({
      a: "x",
      ariaCurrent: "page",
    } as unknown as DomphyElement);

    const el = host.querySelector("a")!;
    expect(el.getAttribute("aria-current")).toBe("page");

    node.patch({ a: "x" } as unknown as DomphyElement);

    expect(el.hasAttribute("aria-current")).toBe(false);
  });
});

describe("empty-string HTML attributes reach the live DOM", () => {
  it("renders alt: \"\" on an img (decorative image)", () => {
    const { host } = mount({
      img: null,
      alt: "",
      src: "x.png",
    } as unknown as DomphyElement);

    const img = host.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe("");
    expect(img.hasAttribute("alt")).toBe(true);
  });
});

describe("AttributeList.addClass() preserves an existing reactive `class` binding", () => {
  it("keeps updating the class after addClass() merges a static class onto a reactive one", async () => {
    const active = toState(true, "addClassOverReactive");
    const { host, node } = mount({
      div: "x",
      class: (l: any) => (active.get(l) ? "active" : ""),
    } as unknown as DomphyElement);

    const el = host.querySelector("div")!;
    expect(el.className).toContain("active");

    node.attributes!.addClass("static-class");
    expect(el.className).toContain("static-class");
    expect(el.className).toContain("active");

    // The original reactive `class` binding must still be live after
    // addClass() — this is exactly what the dead "current is reactive" merge
    // branch was supposed to guarantee.
    active.set(false);
    await flush();

    expect(el.className).not.toContain("active");
    expect(el.className).toContain("static-class");
  });
});
