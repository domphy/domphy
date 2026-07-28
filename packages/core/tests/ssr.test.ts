// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { rawHtml } from "../src/classes/RawHTML.ts";
import { configure } from "../src/config.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

/** Full server->client SSR round trip: generate HTML + CSS, build the DOM, then hydrate. */
function hydrate(App: DomphyElement, opts: { stylePrefix?: string } = {}) {
  const server = new ElementNode(App);
  const html = server.generateHTML();
  const css = server.generateCSS();

  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);

  const styleEl = document.createElement("style");
  styleEl.id = "domphy-style";
  styleEl.textContent = (opts.stylePrefix ?? "") + css;
  document.head.appendChild(styleEl);

  const rootEl = host.firstElementChild as HTMLElement;
  const client = new ElementNode(App);
  client.mount(rootEl, styleEl);

  return { server, client, rootEl, styleEl, html, css };
}

function ruleFor(
  styleEl: HTMLStyleElement,
  classToken: string,
): CSSStyleRule | null {
  for (const r of Array.from(styleEl.sheet?.cssRules ?? [])) {
    const sr = r as CSSStyleRule;
    if (sr.selectorText && sr.selectorText.includes(classToken)) return sr;
  }
  return null;
}

function classToken(el: Element): string {
  return Array.from(el.classList).find((c) => /_[a-z0-9]+$/i.test(c)) ?? "";
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("SSR: generateHTML", () => {
  it("renders tag, attributes, nested children and text", () => {
    const html = new ElementNode({
      div: [{ h1: "Title" }, { p: "Body" }],
      id: "root",
    } as DomphyElement).generateHTML();

    expect(html).toMatch(/^<div /);
    expect(html).toContain('id="root"');
    expect(html).toContain("<h1");
    expect(html).toContain(">Title</h1>");
    expect(html).toContain(">Body</p>");
    expect(html).toMatch(/<\/div>$/);
  });

  it("emits void elements with no closing tag", () => {
    expect(
      new ElementNode({
        input: null,
        type: "text",
      } as DomphyElement).generateHTML(),
    ).toMatch(/^<input [^>]*>$/);
    // <br></br> would be parsed as two <br> by the HTML tokenizer — must be a single tag.
    expect(
      new ElementNode({ br: null } as DomphyElement).generateHTML(),
    ).not.toContain("</br>");
    expect(
      new ElementNode({
        img: null,
        src: "a.png",
      } as DomphyElement).generateHTML(),
    ).not.toContain("</img>");
    expect(
      new ElementNode({ hr: null } as DomphyElement).generateHTML(),
    ).not.toContain("</hr>");
  });

  it("void element output parses back to exactly one node", () => {
    const host = document.createElement("div");
    host.innerHTML = new ElementNode({
      br: null,
    } as DomphyElement).generateHTML();
    expect(host.querySelectorAll("br").length).toBe(1);
  });

  it("serializes boolean attributes presence/absence", () => {
    expect(
      new ElementNode({
        button: "x",
        disabled: true,
      } as DomphyElement).generateHTML(),
    ).toContain("disabled");
    const off = new ElementNode({
      button: "x",
      disabled: false,
    } as DomphyElement).generateHTML();
    expect(off).not.toContain("disabled");
  });

  it("maps translate/autoCapitalize booleans to their HTML enumerated keyword instead of dropping them", () => {
    // translate's missing-value default is "yes" — `translate: false` must
    // render an explicit `translate="no"`, not omit the attribute.
    const off = new ElementNode({
      div: "x",
      translate: false,
    } as DomphyElement).generateHTML();
    expect(off).toContain('translate="no"');

    const on = new ElementNode({
      div: "x",
      translate: true,
    } as DomphyElement).generateHTML();
    expect(on).toContain('translate="yes"');

    const autoCapOff = new ElementNode({
      div: "x",
      autoCapitalize: false,
    } as DomphyElement).generateHTML();
    expect(autoCapOff).toContain('="off"');

    const autoCapOn = new ElementNode({
      div: "x",
      autoCapitalize: true,
    } as DomphyElement).generateHTML();
    expect(autoCapOn).toContain('="on"');
  });

  it("escapes attribute values", () => {
    const html = new ElementNode({
      div: "x",
      title: 'a"b<c>&d',
    } as DomphyElement).generateHTML();
    expect(html).toContain("&quot;");
    expect(html).toContain("&lt;");
    expect(html).toContain("&amp;");
    expect(html).not.toMatch(/title="a"b/);
  });

  it("escapes text content, including markup, unless opted in with rawHtml", () => {
    const plain = new ElementNode({
      div: "1 < 2 & 3 > 0",
    } as DomphyElement).generateHTML();
    expect(plain).toContain("1 &lt; 2 &amp; 3 &gt; 0");
    expect(plain).not.toContain("<2");

    const escaped = new ElementNode({
      div: "<strong>hi</strong>",
    } as DomphyElement).generateHTML();
    expect(escaped).toContain("&lt;strong&gt;hi&lt;/strong&gt;");

    const inline = new ElementNode({
      div: rawHtml("<strong>hi</strong>"),
    } as DomphyElement).generateHTML();
    expect(inline).toContain("<strong>hi</strong>");
  });

  it("renders empty string as a zero-width space entity", () => {
    expect(
      new ElementNode({ div: "" } as DomphyElement).generateHTML(),
    ).toContain("&#8203;");
  });

  it("resolves reactive content/attributes to their initial value", () => {
    const label = toState("hello");
    const html = new ElementNode({
      div: (l: any) => label.get(l),
      title: (l: any) => label.get(l),
    } as DomphyElement).generateHTML();
    expect(html).toContain(">hello</div>");
    expect(html).toContain('title="hello"');
  });

  it("omits (does not stringify) a non-boolean attribute whose value is null or undefined", () => {
    // Regression: previously serialized as the literal text aria-current="undefined"
    // (or "null"), which a screen reader reads as a truthy aria-current value.
    const htmlUndefined = new ElementNode({
      a: "x",
      ariaCurrent: undefined,
    } as DomphyElement).generateHTML();
    expect(htmlUndefined).not.toContain("undefined");
    expect(htmlUndefined).not.toContain("aria-current");

    const htmlNull = new ElementNode({
      a: "x",
      ariaCurrent: null,
    } as DomphyElement).generateHTML();
    expect(htmlNull).not.toContain("null");
    expect(htmlNull).not.toContain("aria-current");
  });

  it("omits a reactive non-boolean attribute that resolves to undefined, keeps it when it resolves to a value", () => {
    const active = toState(false);
    const inactiveHTML = new ElementNode({
      a: "x",
      ariaCurrent: (l: any) => (active.get(l) ? "page" : undefined),
    } as DomphyElement).generateHTML();
    expect(inactiveHTML).not.toContain("aria-current");
    expect(inactiveHTML).not.toContain("undefined");

    const activeHTML = new ElementNode({
      a: "x",
      ariaCurrent: (l: any) => "page",
    } as DomphyElement).generateHTML();
    expect(activeHTML).toContain('aria-current="page"');
  });

  it("does not leave a double space where an omitted attribute used to sit", () => {
    const html = new ElementNode({
      div: "x",
      id: "root",
      title: undefined,
      class: "kept",
    } as DomphyElement).generateHTML();
    expect(html).not.toContain("  ");
  });
});

describe("SSR: generateCSS", () => {
  it("emits a class-scoped rule for inline style", () => {
    const node = new ElementNode({
      div: "x",
      style: { color: "red", fontSize: "12px" },
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toMatch(/\.div_[a-z0-9]+\s*\{/i);
    expect(css).toContain("color: red");
    expect(css).toContain("font-size: 12px");
  });

  it("emits nested selectors and pseudo-classes", () => {
    const css = new ElementNode({
      div: "x",
      style: { "&:hover": { color: "blue" }, "& > span": { margin: "0" } },
    } as DomphyElement).generateCSS();
    expect(css).toMatch(/\.div_[a-z0-9]+:hover\s*\{/i);
    expect(css).toMatch(/\.div_[a-z0-9]+ > span\s*\{/i);
  });

  it("emits media queries", () => {
    const css = new ElementNode({
      div: "x",
      style: { "@media (min-width: 600px)": { color: "green" } },
    } as DomphyElement).generateCSS();
    expect(css).toContain("@media (min-width: 600px)");
    expect(css).toContain("color: green");
  });

  it("emits @media AFTER base properties so at-rule wins the cascade", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        color: "red",
        "@media (max-width: 640px)": { color: "blue" },
      },
    } as DomphyElement).generateCSS();
    // @media block must appear after the base rule so same-specificity cascade
    // lets the at-rule override the base when the condition matches.
    expect(css.indexOf("@media")).toBeGreaterThan(css.indexOf("color: red"));
  });

  it("emits @container AFTER base properties", () => {
    const css = new ElementNode({
      div: "x",
      style: {
        fontSize: "16px",
        "@container (min-width: 400px)": { fontSize: "20px" },
      },
    } as DomphyElement).generateCSS();
    expect(css.indexOf("@container")).toBeGreaterThan(
      css.indexOf("font-size: 16px"),
    );
  });

  it("resolves reactive style props to their initial value", () => {
    const c = toState("red");
    const css = new ElementNode({
      div: "x",
      style: { color: (l: any) => c.get(l) },
    } as DomphyElement).generateCSS();
    expect(css).toContain("color: red");
  });

  it("concatenates child CSS in tree order", () => {
    const css = new ElementNode({
      div: [{ span: "a", style: { color: "red" } }],
      style: { color: "blue" },
    } as DomphyElement).generateCSS();
    expect(css.indexOf("blue")).toBeLessThan(css.indexOf("red"));
  });
});

describe("SSR: hydration via mount()", () => {
  it("throws when the dom element is missing", () => {
    expect(() =>
      new ElementNode({ div: "x" } as DomphyElement).mount(null as any),
    ).toThrow();
  });

  it("binds events to existing DOM and passes the node as 2nd arg", () => {
    let received: any = null;
    const { rootEl } = hydrate({
      button: "go",
      onClick: (_e: any, node: any) => (received = node),
    } as DomphyElement);
    rootEl.dispatchEvent(new window.MouseEvent("click"));
    expect(received).not.toBeNull();
    expect(received.domElement).toBe(rootEl);
  });

  it("does not re-render existing DOM (hydration reuses server markup)", () => {
    const { rootEl } = hydrate({ div: [{ span: "kept" }] } as DomphyElement);
    const span = rootEl.querySelector("span")!;
    // mount must attach to, not recreate, the server node.
    expect(span.textContent).toBe("kept");
    expect(rootEl.querySelectorAll("span").length).toBe(1);
  });

  it("updates a reactive attribute after a state change", async () => {
    const flag = toState("a");
    const { rootEl } = hydrate({
      div: "x",
      dataState: (l: any) => flag.get(l),
    } as DomphyElement);
    expect(rootEl.getAttribute("data-state")).toBe("a");
    flag.set("b");
    await flush();
    expect(rootEl.getAttribute("data-state")).toBe("b");
  });

  it("updates a reactive style on the existing stylesheet rule (no re-render)", async () => {
    const color = toState("red");
    const { rootEl, styleEl } = hydrate({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement);
    const token = classToken(rootEl);
    expect(ruleFor(styleEl, token)?.style.color).toBe("red");
    color.set("green");
    await flush();
    expect(ruleFor(styleEl, token)?.style.color).toBe("green");
  });

  it("updates a reactive nested/pseudo style rule after hydration", async () => {
    const color = toState("red");
    const { rootEl, styleEl } = hydrate({
      div: "x",
      style: { "&:hover": { color: (l: any) => color.get(l) } },
    } as DomphyElement);
    const token = classToken(rootEl);
    color.set("blue");
    await flush();
    const hoverRule = Array.from(styleEl.sheet!.cssRules).find(
      (r) => (r as CSSStyleRule).selectorText === `.${token}:hover`,
    ) as CSSStyleRule;
    expect(hoverRule.style.color).toBe("blue");
  });

  it("binds reactive styles even when unrelated rules precede them (themeCSS prefix)", async () => {
    const color = toState("red");
    const prefix = `[data-theme="light"]{--primary-0:#fff}.unrelated{color:black}`;
    const { rootEl, styleEl } = hydrate(
      { div: "x", style: { color: (l: any) => color.get(l) } } as DomphyElement,
      { stylePrefix: prefix },
    );
    const token = classToken(rootEl);
    color.set("orange");
    await flush();
    expect(ruleFor(styleEl, token)?.style.color).toBe("orange");
  });

  it("replaces reactive text without duplicating the server node", async () => {
    const count = toState(0);
    const { rootEl } = hydrate({
      span: (l: any) => `n=${count.get(l)}`,
    } as DomphyElement);
    expect(rootEl.textContent).toBe("n=0");
    count.set(7);
    await flush();
    expect(rootEl.textContent).toBe("n=7"); // not "n=7n=0"
    expect(rootEl.childNodes.length).toBe(1);
  });

  it("reconciles a keyed reactive list after hydration (reorder reuses DOM nodes)", async () => {
    const items = toState([
      { id: 1, n: "a" },
      { id: 2, n: "b" },
    ]);
    const { rootEl } = hydrate({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({ li: it.n, _key: it.id })),
    } as DomphyElement);

    const lis = Array.from(rootEl.querySelectorAll("li"));
    expect(lis.map((li) => li.textContent)).toEqual(["a", "b"]);
    const firstLi = lis[0];

    items.set([
      { id: 2, n: "b" },
      { id: 1, n: "a" },
    ]);
    await flush();

    const reordered = Array.from(rootEl.querySelectorAll("li"));
    expect(reordered.map((li) => li.textContent)).toEqual(["b", "a"]);
    // keyed node id=1 reused, now at the end
    expect(reordered[1]).toBe(firstLi);
  });

  it("removes a keyed list item from the DOM after hydration", async () => {
    const items = toState([
      { id: 1, n: "a" },
      { id: 2, n: "b" },
    ]);
    const { rootEl } = hydrate({
      ul: (l: any) =>
        items.get(l).map((it: any) => ({ li: it.n, _key: it.id })),
    } as DomphyElement);
    expect(rootEl.querySelectorAll("li").length).toBe(2);

    items.set([{ id: 2, n: "b" }]);
    await flush();
    const lis = Array.from(rootEl.querySelectorAll("li"));
    expect(lis.map((li) => li.textContent)).toEqual(["b"]);
  });

  it("hydrates a tree containing void + text + element children with correct alignment", async () => {
    const value = toState("hi");
    const { rootEl } = hydrate({
      form: [
        { label: "Name" },
        { input: null, value: (l: any) => value.get(l) },
        { button: "Save" },
      ],
    } as DomphyElement);

    const input = rootEl.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(rootEl.querySelector("button")!.textContent).toBe("Save");
    // `value` is a mutate-as-property attribute, so reactive updates land on the
    // DOM property rather than the markup attribute.
    expect(input.value).toBe("hi");
    value.set("bye");
    await flush();
    expect(input.value).toBe("bye");
  });

  it("releases listeners on removal so reactive updates stop", async () => {
    const color = toState("red");
    const { client, styleEl, rootEl } = hydrate({
      div: "x",
      style: { color: (l: any) => color.get(l) },
    } as DomphyElement);
    const token = classToken(rootEl);
    client.remove();
    color.set("purple");
    await flush();
    // rule is gone or at least not mutated to the post-removal value
    const rule = ruleFor(styleEl, token);
    expect(rule?.style.color ?? "red").not.toBe("purple");
  });
});

describe("XSS: a plain string child is TEXT, never HTML", () => {
  // The default is escape. Markup in a plain string renders as visible
  // characters — no element is ever created from it, on either side of SSR.

  it("escapes markup in a string child (generateHTML / SSR)", () => {
    const html = new ElementNode({
      div: '<img src=x onerror="alert(1)">',
    } as DomphyElement).generateHTML();
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
  });

  it("creates no element from a string child (client _createDOMNode)", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: '<img src=x onerror="alert(1)">',
    } as DomphyElement).render(host);
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("escapes an iframe srcdoc payload instead of mounting it", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    } as DomphyElement).render(host);
    expect(host.querySelector("iframe")).toBeNull();
    expect(
      new ElementNode({
        div: '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      } as DomphyElement).generateHTML(),
    ).not.toContain("<iframe");
  });

  it("escapes markup arriving through a reactive child", async () => {
    const text = toState("safe");
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) => text.get(l),
    } as DomphyElement).render(host);
    text.set("<img src=x onerror=alert(1)>");
    await flush();
    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("rawHtml(): the explicit HTML opt-in, still sanitized", () => {
  it("renders markup as real DOM (client)", () => {
    const host = document.createElement("div");
    new ElementNode({
      div: rawHtml("<strong>bold</strong>"),
    } as DomphyElement).render(host);
    expect(host.querySelector("strong")!.textContent).toBe("bold");
  });

  it("renders markup as markup (SSR)", () => {
    const html = new ElementNode({
      div: rawHtml("<strong>bold</strong>"),
    } as DomphyElement).generateHTML();
    expect(html).toContain("<strong>bold</strong>");
  });

  it("strips on* attributes (SSR + client)", () => {
    const html = new ElementNode({
      div: rawHtml('<span onclick="alert(1)">text</span>'),
    } as DomphyElement).generateHTML();
    expect(html).not.toContain("onclick");
    expect(html).toContain("text");

    const host = document.createElement("div");
    new ElementNode({
      div: rawHtml('<a href="ok" onclick="alert(1)">link</a>'),
    } as DomphyElement).render(host);
    expect(host.querySelector("a")!.getAttribute("onclick")).toBeNull();
    expect(host.querySelector("a")!.getAttribute("href")).toBe("ok");
  });

  it("neutralises javascript: URLs (SSR)", () => {
    const html = new ElementNode({
      div: rawHtml('<a href="javascript:alert(1)">x</a>'),
    } as DomphyElement).generateHTML();
    expect(html).not.toContain("javascript:");
  });

  it("strips <script> elements (SSR)", () => {
    const html = new ElementNode({
      div: rawHtml("<div>ok</div><script>alert(1)</script>"),
    } as DomphyElement).generateHTML();
    expect(html).not.toContain("<script");
    expect(html).toContain("ok");
  });

  it("swaps between text and HTML across reactive updates", async () => {
    const child = toState<any>("plain <b>text</b>");
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) => child.get(l),
    } as DomphyElement).render(host);
    expect(host.querySelector("b")).toBeNull();

    child.set(rawHtml("<b>real</b>"));
    await flush();
    expect(host.querySelector("b")!.textContent).toBe("real");

    child.set("back to text");
    await flush();
    expect(host.querySelector("b")).toBeNull();
    expect(host.textContent).toBe("back to text");
  });
});

describe("CSP: nonce support", () => {
  afterEach(() => configure({ cspNonce: undefined }));

  it("applies nonce to the injected <style> element when configure() sets cspNonce", () => {
    configure({ cspNonce: "test-nonce-123" });
    const host = document.createElement("div");
    document.body.appendChild(host);
    new ElementNode({
      div: "x",
      style: { color: "red" },
    } as DomphyElement).render(host);
    const style =
      document.head.querySelector<HTMLStyleElement>("#domphy-style");
    expect(style?.nonce).toBe("test-nonce-123");
  });
});

describe("Error boundary: _onError hook", () => {
  it("calls _onError when a reactive child throws", async () => {
    const errors: unknown[] = [];
    const boom = toState(false);
    const host = document.createElement("div");
    new ElementNode({
      div: (l: any) => {
        if (boom.get(l)) throw new Error("boom");
        return "ok";
      },
      _onError: (_node: any, err: unknown) => errors.push(err),
    } as any).render(host);
    expect(errors).toHaveLength(0);
    boom.set(true);
    await flush();
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("boom");
  });

  it("walks up to find the nearest _onError ancestor", async () => {
    const errors: unknown[] = [];
    const boom = toState(false);
    const host = document.createElement("div");
    new ElementNode({
      div: [
        {
          span: (l: any) => {
            if (boom.get(l)) throw new Error("child");
            return "ok";
          },
        },
      ],
      _onError: (_node: any, err: unknown) => errors.push(err),
    } as any).render(host);
    boom.set(true);
    await flush();
    expect(errors).toHaveLength(1);
  });
});

describe("SSR: server/client HTML parity", () => {
  it("produces identical structure on server generateHTML and client re-render", () => {
    const App: DomphyElement = {
      section: [
        { h2: "Heading" },
        { p: "Para" },
        { input: null, type: "text" },
      ],
      id: "main",
    } as DomphyElement;

    const serverHTML = new ElementNode(App).generateHTML();

    const mountPoint = document.createElement("div");
    new ElementNode(App).render(mountPoint);
    const clientHTML = mountPoint.innerHTML;

    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    // class hashes are deterministic, so server and client markup must match.
    expect(norm(clientHTML)).toBe(norm(serverHTML));
  });
});
