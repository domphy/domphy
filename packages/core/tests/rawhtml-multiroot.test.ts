// @vitest-environment jsdom
//
// Multi-root rawHtml(): previously TextNode._createDOMNode kept only
// `tpl.content.firstChild` while generateHTML() emitted the whole string, so
// rawHtml("<b>a</b><i>b</i>") rendered BOTH roots in SSR but only <b> on the
// client — guaranteed hydration drift. The fix tracks every root (the first
// stays the slot anchor, the rest live in TextNode._domExtras) and mount()
// hydration binds children by a DOM cursor advanced by each child's span.
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { rawHtml } from "../src/classes/RawHTML.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

/** Server -> client round trip, same shape as ssr.test.ts. */
function hydrate(App: DomphyElement) {
  const server = new ElementNode(App);
  const html = server.generateHTML();

  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);

  const rootEl = host.firstElementChild as HTMLElement;
  const client = new ElementNode(App);
  client.mount(rootEl);
  return { server, client, rootEl, html };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("multi-root rawHtml(): client rendering", () => {
  it("renders ALL roots of a multi-root rawHtml child, not just the first", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: rawHtml("<b>a</b><i>b</i>"),
    } as DomphyElement).render(host);

    expect(host.querySelector("b")!.textContent).toBe("a");
    expect(host.querySelector("i")!.textContent).toBe("b");
    // div > b + i, nothing dropped, nothing extra.
    expect(host.firstElementChild!.childNodes.length).toBe(2);
  });

  it("keeps siblings after a multi-root rawHtml child in the right order", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: [rawHtml("<b>a</b><i>b</i>"), { span: "tail" }],
    } as DomphyElement).render(host);

    const div = host.firstElementChild!;
    expect(div.childNodes.length).toBe(3);
    expect((div.childNodes[0] as HTMLElement).tagName).toBe("B");
    expect((div.childNodes[1] as HTMLElement).tagName).toBe("I");
    expect((div.childNodes[2] as HTMLElement).tagName).toBe("SPAN");
  });
});

describe("multi-root rawHtml(): SSR + hydration alignment", () => {
  it("hydrates a multi-root rawHtml child followed by a reactive sibling with no drift", async () => {
    const label = toState("x");
    const { rootEl } = hydrate({
      div: [rawHtml("<b>a</b><i>b</i>"), { span: (l: any) => label.get(l) }],
    } as DomphyElement);

    // Final DOM matches the server structure exactly.
    expect(rootEl.querySelector("b")!.textContent).toBe("a");
    expect(rootEl.querySelector("i")!.textContent).toBe("b");
    expect(rootEl.querySelector("span")!.textContent).toBe("x");
    expect(rootEl.childNodes.length).toBe(3);

    // The sibling AFTER the multi-root slot bound to the right server node:
    // a reactive update patches the span, not one of the rawHtml roots.
    label.set("y");
    await flush();
    expect(rootEl.querySelector("span")!.textContent).toBe("y");
    expect(rootEl.querySelector("b")!.textContent).toBe("a");
    expect(rootEl.querySelector("i")!.textContent).toBe("b");
    expect(rootEl.childNodes.length).toBe(3);
  });

  it("aligns when the rawHtml string has leading/trailing whitespace", () => {
    // SSR trims the emitted markup exactly like the client parse does, so no
    // phantom whitespace text node exists on one side only.
    const { rootEl, html } = hydrate({
      div: [rawHtml("  <b>a</b>  "), { span: "tail" }],
    } as DomphyElement);
    expect(rootEl.querySelector("b")!.textContent).toBe("a");
    expect(rootEl.querySelector("span")!.textContent).toBe("tail");
    expect(html).toContain("<b>a</b>");
  });

  it("server and client produce the same structure for a multi-root child", () => {
    const App = {
      div: [rawHtml("<b>a</b> <i>b</i>"), { span: "s" }],
    } as DomphyElement;
    const serverHTML = new ElementNode(App).generateHTML();

    const mountPoint = document.createElement("div");
    new ElementNode(App).render(mountPoint);

    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    expect(norm(mountPoint.innerHTML)).toBe(norm(serverHTML));
  });
});

describe("multi-root rawHtml(): reactive updates and removal", () => {
  it("replaces a multi-root rawHtml child with a single-root one, dropping the extra roots", async () => {
    const child = toState<any>(rawHtml("<b>a</b><i>b</i>"));
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) => child.get(l),
    } as DomphyElement).render(host);

    const div = host.firstElementChild!;
    expect(div.childNodes.length).toBe(2);

    child.set(rawHtml("<u>c</u>"));
    await flush();

    expect(div.childNodes.length).toBe(1);
    expect(div.querySelector("u")!.textContent).toBe("c");
    expect(div.querySelector("b")).toBeNull();
    expect(div.querySelector("i")).toBeNull();
  });

  it("swaps between multi-root HTML and plain text across updates", async () => {
    const child = toState<any>("plain");
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) => child.get(l),
    } as DomphyElement).render(host);

    child.set(rawHtml("<b>a</b><i>b</i>"));
    await flush();
    const div = host.firstElementChild!;
    expect(div.childNodes.length).toBe(2);

    child.set("back to text");
    await flush();
    expect(div.childNodes.length).toBe(1);
    expect(div.textContent).toBe("back to text");
  });

  it("removes every root when a multi-root rawHtml child leaves a list", async () => {
    const show = toState(true);
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) =>
        show.get(l) ? [rawHtml("<b>a</b><i>b</i>"), "tail"] : ["tail"],
    } as DomphyElement).render(host);

    const div = host.firstElementChild!;
    expect(div.childNodes.length).toBe(3);

    show.set(false);
    await flush();

    expect(div.childNodes.length).toBe(1);
    expect(div.textContent).toBe("tail");
    expect(div.querySelector("b")).toBeNull();
    expect(div.querySelector("i")).toBeNull();
  });

  it("moves a multi-root rawHtml child as a group on children.swap()", () => {
    const host = document.createElement("div");
    const node = new ElementNode({
      div: [rawHtml("<b>a</b><i>b</i>"), { span: "s" }],
    } as DomphyElement);
    node.render(host);

    node.children.swap(0, 1);

    const div = host.firstElementChild!;
    expect(div.childNodes.length).toBe(3);
    expect((div.childNodes[0] as HTMLElement).tagName).toBe("SPAN");
    expect((div.childNodes[1] as HTMLElement).tagName).toBe("B");
    expect((div.childNodes[2] as HTMLElement).tagName).toBe("I");
  });
});

describe("rawHtml(): the client parse shares the server sanitizer", () => {
  it("strips iframe srcdoc on the client too", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: rawHtml('<iframe srcdoc="<p>evil</p>">x</iframe>'),
    } as DomphyElement).render(host);
    const iframe = host.querySelector("iframe")!;
    expect(iframe.getAttribute("srcdoc")).toBeNull();
  });

  it("neutralises an entity-encoded javascript: URL on the client", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: rawHtml('<a href="&#106;avascript:alert(1)">x</a>'),
    } as DomphyElement).render(host);
    expect(host.querySelector("a")!.getAttribute("href")).toBe("#");
  });
});
