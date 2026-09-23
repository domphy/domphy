// @vitest-environment jsdom
//
// Custom elements / web components. Truth sources:
//  - the HTML Standard's "valid custom element name" production
//    (https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)
//    for which keys count as an element tag;
//  - React 19's and Preact's documented prop rule for custom elements — a key
//    naming a property of the element INSTANCE is assigned as a property, so
//    objects/arrays survive; everything else becomes an attribute;
//  - real jsdom element upgrade (customElements.define) for the observed
//    property/attribute/event behavior.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { getTagName, isCustomElementName, validate } from "../src/helpers.ts";
import type { DomphyElement } from "../src/types.ts";

class TestWidget extends HTMLElement {
  // Declared property: the React/Preact rule assigns to it instead of
  // stringifying onto an attribute.
  config: unknown = null;
  items: unknown = null;
}

beforeEach(() => {
  if (!customElements.get("test-widget")) {
    customElements.define("test-widget", TestWidget);
  }
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

function mountToBody(element: DomphyElement): {
  node: ElementNode;
  dom: HTMLElement;
} {
  const node = new ElementNode(element);
  const dom = node.render(document.body) as unknown as HTMLElement;
  return { node, dom };
}

describe("valid custom element name (HTML Standard §4.13.4 production)", () => {
  it("requires a leading [a-z], a hyphen, and no uppercase ASCII", () => {
    // PotentialCustomElementName := [a-z] (PCENChar)* '-' (PCENChar)*
    expect(isCustomElementName("my-widget")).toBe(true);
    expect(isCustomElementName("sl-button")).toBe(true);
    expect(isCustomElementName("x-")).toBe(true);
    expect(isCustomElementName("a-b-c")).toBe(true);
    expect(isCustomElementName("math-α")).toBe(true); // PCENChar covers U+03B1

    expect(isCustomElementName("nohyphen")).toBe(false);
    expect(isCustomElementName("-leading")).toBe(false); // must start [a-z]
    expect(isCustomElementName("1-digit")).toBe(false);
    expect(isCustomElementName("My-Widget")).toBe(false); // no uppercase ASCII
    expect(isCustomElementName("my widget-x")).toBe(false);
  });

  it("rejects the eight names the spec reserves for SVG/MathML", () => {
    for (const reserved of [
      "annotation-xml",
      "color-profile",
      "font-face",
      "font-face-src",
      "font-face-uri",
      "font-face-format",
      "font-face-name",
      "missing-glyph",
    ]) {
      expect(isCustomElementName(reserved)).toBe(false);
    }
  });

  it("accepts a custom element name as an element tag key", () => {
    expect(() => validate({ "my-widget": "hi" } as any)).not.toThrow();
    expect(getTagName({ "my-widget": "hi" } as any)).toBe("my-widget");
  });

  it("still prefers a built-in tag over a hyphenated attribute key", () => {
    // `data-*`/`aria-*` keys match the spec production too — key order must
    // not turn `{ "data-id": 1, div: "x" }` into a <data-id> element.
    expect(getTagName({ "data-id": 1, div: "x" } as any)).toBe("div");
    expect(getTagName({ "aria-label": "x", span: "y" } as any)).toBe("span");
  });
});

describe("custom element rendering", () => {
  it("creates the element and renders children", () => {
    const { dom } = mountToBody({ "my-widget": "hello" } as any);
    expect(dom.tagName.toLowerCase()).toBe("my-widget");
    expect(dom.textContent).toBe("hello");
  });

  it("assigns a declared instance property instead of an attribute (React 19 rule)", () => {
    const config = { series: [1, 2, 3] };
    const { dom } = mountToBody({
      "test-widget": null,
      config,
      items: ["a", "b"],
    } as any);

    expect((dom as TestWidget).config).toBe(config);
    expect(dom.hasAttribute("config")).toBe(false);
    expect((dom as TestWidget).items).toEqual(["a", "b"]);
    expect(dom.hasAttribute("items")).toBe(false);
  });

  it("assigns an object prop even before upgrade, so the definition can pick it up", () => {
    const config = { a: 1 };
    const { dom } = mountToBody({
      "not-yet-defined": null,
      config,
    } as any);
    expect((dom as any).config).toBe(config);
    expect(dom.hasAttribute("config")).toBe(false);
  });

  it("keeps primitives on attributes, including boolean attributes", () => {
    const { dom } = mountToBody({
      "my-widget": null,
      "help-text": "hint",
      count: 3,
      disabled: true,
    } as any);
    expect(dom.getAttribute("help-text")).toBe("hint");
    expect(dom.getAttribute("count")).toBe("3");
    expect(dom.getAttribute("disabled")).toBe("");
  });

  it("clears a property when the prop is patched away", () => {
    const node = new ElementNode({
      "test-widget": null,
      config: { a: 1 },
    } as any);
    const dom = node.render(document.body) as unknown as TestWidget;
    expect(dom.config).toEqual({ a: 1 });

    node.patch({ "test-widget": null } as any);
    expect(dom.config).toBeUndefined();
  });
});

describe("custom element events", () => {
  it("listens to a case-sensitive custom event name (Preact rule)", () => {
    const seen: string[] = [];
    const { dom } = mountToBody({
      "my-widget": null,
      "onsl-change": () => seen.push("sl-change"),
      onMyEvent: () => seen.push("MyEvent"),
    } as any);

    dom.dispatchEvent(new CustomEvent("sl-change"));
    dom.dispatchEvent(new CustomEvent("MyEvent"));
    dom.dispatchEvent(new CustomEvent("myevent")); // wrong case — no listener

    expect(seen).toEqual(["sl-change", "MyEvent"]);
  });

  it("still lowercases standard DOM events on a custom element", () => {
    let clicks = 0;
    const { dom } = mountToBody({
      "my-widget": null,
      onClick: () => clicks++,
    } as any);
    dom.dispatchEvent(new MouseEvent("click"));
    expect(clicks).toBe(1);
  });

  it("receives the event detail and the ElementNode", () => {
    let detail: unknown = null;
    let sameNode = false;
    const node = new ElementNode({
      "my-widget": null,
      onPicked: (event: any, n: any) => {
        detail = event.detail;
        sameNode = n === node;
      },
    } as any);
    const dom = node.render(document.body) as unknown as HTMLElement;
    dom.dispatchEvent(new CustomEvent("Picked", { detail: { id: 7 } }));
    expect(detail).toEqual({ id: 7 });
    expect(sameNode).toBe(true);
  });
});

describe("custom element SSR and hydration", () => {
  it("serializes primitive props and omits non-primitive ones", () => {
    const html = new ElementNode({
      "test-widget": "body",
      "help-text": "hint",
      config: { a: 1 },
    } as any).generateHTML();

    expect(html).toContain('help-text="hint"');
    expect(html).not.toContain("config");
    expect(html).not.toContain("[object Object]");
    expect(html).toMatch(/^<test-widget[^>]*>body<\/test-widget>$/);
  });

  it("assigns the omitted object prop on hydration", () => {
    const config = { a: 1 };
    const server = new ElementNode({
      "test-widget": "body",
      config,
      "help-text": "hint",
    } as any);
    document.body.innerHTML = server.generateHTML();
    const serverDom = document.body.firstElementChild as TestWidget;
    expect(serverDom.config).toBe(null);

    new ElementNode({
      "test-widget": "body",
      config,
      "help-text": "hint",
    } as any).mount(serverDom);

    expect(serverDom.config).toBe(config);
    expect(serverDom.getAttribute("help-text")).toBe("hint");
  });

  // HTML reserves `data-*` (HTML Standard 3.2.6.6) and `aria-*` (WAI-ARIA) as
  // ATTRIBUTE namespaces, yet both match the valid-custom-element-name
  // production the tag lookup uses — and patches add them routinely. The tag
  // lookup must therefore never read one as a tag.
  it("never reads a data-*/aria-* key as the tag (HTML/ARIA reserved namespaces)", () => {
    expect(
      () => new ElementNode({ "aria-label": "Close", "my-widget": "x" } as any),
    ).toThrow(/not a valid HTML tag name/);
    expect(
      () => new ElementNode({ "data-id": "7", "my-widget": "x" } as any),
    ).toThrow(/not a valid HTML tag name/);
  });

  it("keeps the declared first key as the tag when hyphenated attributes follow", () => {
    const node = new ElementNode({
      "my-widget": "content",
      "aria-label": "Close",
      "data-id": "7",
    } as any);
    expect(node.tagName).toBe("my-widget");
    expect(node.generateHTML()).toContain('aria-label="Close"');
  });
});
