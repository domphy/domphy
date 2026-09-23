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

  it("non-textarea parents hold the slot with an empty text node", () => {
    const el = render({ div: "" } as DomphyElement);
    // No printable character: a zero-width space here landed in the
    // accessible name, so `<button aria-label="Close">{null}</button>`
    // computed its name from content and a role="alert" was never empty.
    expect(el.textContent).toBe("");
    expect(el.childNodes.length).toBe(1);
    expect(el.childNodes[0].nodeType).toBe(3);
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

describe("empty text child and the accessible name", () => {
  // HTML-AAM / accname: text nodes contribute to an element's name from
  // content; comments and empty text nodes do not. A U+200B placeholder is a
  // printable character, so it made these two cases wrong.
  it("leaves a button with a reactive null child textually empty", () => {
    const label = toState<string | null>(null);
    const el = render({
      button: (l: any) => label.get(l),
      ariaLabel: "Close",
    } as DomphyElement);
    expect(el.textContent).toBe("");
    label.set("Dismiss");
    flushSync();
    expect(el.textContent).toBe("Dismiss");
    label.set(null);
    flushSync();
    expect(el.textContent).toBe("");
  });

  it("leaves an empty live region textually empty", () => {
    const message = toState("");
    const el = render({
      div: (l: any) => message.get(l),
      role: "alert",
    } as DomphyElement);
    expect(el.textContent).toBe("");
    expect(el.innerHTML).toBe("");
  });

  it("SSR + hydration of an empty child: no printable placeholder, updates land", () => {
    const message = toState("");
    const App = {
      div: (l: any) => message.get(l),
      role: "alert",
    } as DomphyElement;
    const server = new ElementNode(App);
    const host = document.createElement("div");
    host.innerHTML = server.generateHTML();
    document.body.appendChild(host);
    const rootEl = host.firstElementChild as HTMLElement;
    expect(rootEl.textContent).toBe("");

    new ElementNode(App).mount(rootEl);
    expect(rootEl.textContent).toBe("");
    message.set("Saved");
    flushSync();
    expect(rootEl.textContent).toBe("Saved");
    message.set("");
    flushSync();
    expect(rootEl.textContent).toBe("");
  });
});
