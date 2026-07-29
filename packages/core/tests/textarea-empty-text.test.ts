// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { flushSync } from "../src/classes/Reactive.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

function render(App: DomphyElement): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return host.firstElementChild as HTMLElement;
}

describe("textarea empty text child", () => {
  it("keeps .value empty so the native placeholder shows", () => {
    const el = render({
      textarea: "",
      placeholder: "Type here",
    } as DomphyElement) as HTMLTextAreaElement;
    expect(el.value).toBe("");
  });

  it("still holds a slot node for later reactive updates", () => {
    const text = toState("");
    const el = render({
      textarea: (l: any) => text.get(l),
    } as DomphyElement) as HTMLTextAreaElement;
    expect(el.value).toBe("");
    text.set("hello");
    flushSync();
    expect(el.value).toBe("hello");
    text.set("");
    flushSync();
    expect(el.value).toBe("");
  });

  it("non-textarea parents still use the ZWSP slot-holder", () => {
    const el = render({ div: "" } as DomphyElement);
    expect(el.textContent).toBe(String.fromCharCode(0x200b));
  });
});

describe("textarea empty text child — SSR", () => {
  it("generateHTML emits no &#8203; inside a textarea", () => {
    const html = new ElementNode({
      textarea: "",
    } as DomphyElement).generateHTML();
    expect(html).not.toContain("&#8203;");
    expect(html).toContain("<textarea");
    expect(html).toContain("</textarea>");
  });

  it("hydration binds a slot node so post-hydration updates land", () => {
    const App = {
      textarea: (l: any) => text.get(l),
      placeholder: "Type here",
    } as DomphyElement;
    const text = toState("");

    const server = new ElementNode(App);
    const host = document.createElement("div");
    host.innerHTML = server.generateHTML();
    document.body.appendChild(host);
    const styleEl = document.createElement("style");
    styleEl.textContent = server.generateCSS();
    document.head.appendChild(styleEl);

    const rootEl = host.firstElementChild as HTMLTextAreaElement;
    expect(rootEl.value).toBe("");

    const client = new ElementNode(App);
    client.mount(rootEl, styleEl);
    expect(rootEl.value).toBe("");

    text.set("after hydration");
    flushSync();
    expect(rootEl.value).toBe("after hydration");
  });
});
