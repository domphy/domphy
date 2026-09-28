// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

// Regression: a <select> declared with a `value` attribute (static or
// reactive) always showed the FIRST <option>. ElementNode._createDOMNode()
// applied every attribute — including `value` — right after creating the
// <select> element itself, before its <option> children were mounted.
// HTMLSelectElement has no content attribute backing `.value` (unlike
// checked/selected): the property setter only works by matching an existing
// <option>, and per the DOM spec assigning it while the select has no
// options is a silent no-op — the browser leaves selectedIndex at whatever
// it already was (0, once options are later appended with none marked
// selected). Fixed by deferring `value`'s DOM-property assignment
// (ElementNode._applyDeferredAttributes) until after this node's children
// exist, on every path that creates a <select> DOM node: ElementNode.render()
// (fresh render), ElementNode.mount() (hydration — the server DOM can't
// encode select value either, so the client corrects it) and
// ElementList.insert() (an imperative/reactive children insert).
//
// Truth source: the DOM spec's own definition of HTMLSelectElement.value
// (https://html.spec.whatwg.org/multipage/form-elements.html#dom-select-value)
// — it reflects whichever <option> has `selected` true, which the value
// setter achieves by finding the option whose value matches.

const OPTIONS: DomphyElement = {
  select: [
    { option: "A", value: "a" },
    { option: "B", value: "b" },
    { option: "C", value: "c" },
  ],
  value: "b",
} as unknown as DomphyElement;

function mount(el: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(el);
  node.render(host);
  return { host, node, select: host.querySelector("select")! };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe("<select value> reflects the matching <option>, not the first one", () => {
  it("a static `value` selects option B on initial render", () => {
    const { select } = mount(OPTIONS);
    expect(select.value).toBe("b");
    expect((select.options[1] as HTMLOptionElement).selected).toBe(true);
    expect((select.options[0] as HTMLOptionElement).selected).toBe(false);
  });

  it("a reactive `value` selects the current state on initial render, and follows a later change", async () => {
    const current = toState("b");
    const { select } = mount({
      select: [
        { option: "A", value: "a" },
        { option: "B", value: "b" },
        { option: "C", value: "c" },
      ],
      value: (l: any) => current.get(l),
    } as unknown as DomphyElement);

    expect(select.value).toBe("b");

    current.set("c");
    await flush();
    expect(select.value).toBe("c");
    expect((select.options[2] as HTMLOptionElement).selected).toBe(true);
  });

  it("hydration (mount) corrects the value too — the server DOM cannot encode it", () => {
    const ssrNode = new ElementNode(OPTIONS);
    const html = ssrNode.generateHTML();
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);
    const serverSelect = host.querySelector("select")!;

    const clientNode = new ElementNode(OPTIONS);
    clientNode.mount(serverSelect);

    expect(serverSelect.value).toBe("b");
  });

  it("an imperative children.insert of a new <select> also selects the right option", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = new ElementNode({ div: [] } as unknown as DomphyElement);
    root.render(host);

    root.children.insert(OPTIONS);
    const select = host.querySelector("select")!;
    expect(select.value).toBe("b");
  });

  it("<input>/<textarea> value is unaffected (no children to wait for)", () => {
    const { host } = mount({
      div: [
        { input: null, value: "hello" },
        { textarea: null, value: "world" },
      ],
    } as unknown as DomphyElement);

    expect((host.querySelector("input") as HTMLInputElement).value).toBe(
      "hello",
    );
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(
      "world",
    );
  });
});
