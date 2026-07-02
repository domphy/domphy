// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { afterEach, describe, expect, it } from "vitest";
import {
  badge,
  button,
  card,
  code,
  heading,
  inputPassword,
  link,
  paragraph,
} from "../src/index.ts";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

function hydrate(App: DomphyElement) {
  const server = new ElementNode(App);
  const html = server.generateHTML();
  const css = server.generateCSS();

  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);

  const styleEl = document.createElement("style");
  styleEl.id = "domphy-style";
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const rootEl = host.firstElementChild as HTMLElement;
  const client = new ElementNode(App);
  client.mount(rootEl, styleEl);
  return { client, rootEl, styleEl, html, css };
}

function classToken(el: Element): string {
  return Array.from(el.classList).find((c) => /_[a-z0-9]+$/i.test(c)) ?? "";
}

function ruleFor(
  styleEl: HTMLStyleElement,
  token: string,
): CSSStyleRule | null {
  // Match the element's base rule exactly (`.tag_hash`), not state variants
  // like `.tag_hash[disabled]` or `.tag_hash:hover`.
  for (const r of Array.from(styleEl.sheet?.cssRules ?? [])) {
    const sr = r as CSSStyleRule;
    if (sr.selectorText === `.${token}`) return sr;
  }
  return null;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => {
    s.remove();
  });
});

const PATCH_CASES: Array<{ name: string; tag: string; el: DomphyElement }> = [
  {
    name: "button",
    tag: "button",
    el: { button: "Save", $: [button()] } as DomphyElement,
  },
  {
    name: "card",
    tag: "div",
    el: { div: [{ p: "body" }], $: [card()] } as DomphyElement,
  },
  {
    name: "link",
    tag: "a",
    el: { a: "Home", href: "/", $: [link()] } as DomphyElement,
  },
  {
    name: "heading",
    tag: "h2",
    el: { h2: "Title", $: [heading()] } as DomphyElement,
  },
  {
    name: "code",
    tag: "code",
    el: { code: "x=1", $: [code()] } as DomphyElement,
  },
  {
    name: "badge",
    tag: "span",
    el: { span: "9", $: [badge()] } as DomphyElement,
  },
  {
    name: "paragraph",
    tag: "p",
    el: { p: "Lorem ipsum", $: [paragraph()] } as DomphyElement,
  },
];

describe("UI patches: SSR generate + hydrate", () => {
  for (const c of PATCH_CASES) {
    it(`${c.name} renders to HTML+CSS and hydrates without error`, () => {
      const node = new ElementNode(c.el);
      const html = node.generateHTML();
      const css = node.generateCSS();

      expect(html.startsWith(`<${c.tag}`)).toBe(true);
      expect(css.length).toBeGreaterThan(0);
      expect(css).toMatch(new RegExp(`\\.${c.tag}_[a-z0-9]+`, "i"));

      // round-trip hydrate must not throw and must reuse the server node
      const { rootEl } = hydrate(c.el);
      expect(rootEl.tagName.toLowerCase()).toBe(c.tag);
      expect(
        document.querySelectorAll(`${c.tag}`).length,
      ).toBeGreaterThanOrEqual(1);
    });
  }

  it("button SSR output uses theme variable references, not hard-coded colors", () => {
    const css = new ElementNode({
      button: "Go",
      $: [button({ color: "primary" })],
    } as DomphyElement).generateCSS();
    expect(css).toContain("var(--primary-");
  });

  it("reactive patch color updates the live stylesheet after hydration", async () => {
    const color = toState<ThemeColor>("primary");
    const { rootEl, styleEl } = hydrate({
      button: "Delete",
      $: [button({ color })],
    } as DomphyElement);

    const token = classToken(rootEl);
    const rule = ruleFor(styleEl, token);
    expect(rule?.style.backgroundColor).toContain("var(--primary-");

    color.set("danger");
    await flush();
    expect(ruleFor(styleEl, token)?.style.backgroundColor).toContain(
      "var(--danger-",
    );
  });

  it("inputPassword renders its input/toggle markup in generateHTML() (not only via imperative _onMount DOM mutation)", () => {
    const html = new ElementNode({
      div: null,
      $: [inputPassword()],
    } as DomphyElement).generateHTML();
    expect(html).toContain('type="password"');
    expect(html.match(/<button/g)?.length).toBe(1);
  });

  it("inputPassword toggle button flips the input type after hydration", () => {
    const { rootEl } = hydrate({
      div: null,
      $: [inputPassword()],
    } as DomphyElement);
    const field = rootEl.querySelector("input")!;
    const toggle = rootEl.querySelector("button")!;
    expect(field.type).toBe("password");
    toggle.click();
    flushSync();
    expect(field.type).toBe("text");
    toggle.click();
    flushSync();
    expect(field.type).toBe("password");
  });

  it("card composes a slot subtree that hydrates with intact children", () => {
    const { rootEl } = hydrate({
      div: [{ h3: "Card title" }, { p: "Card body" }],
      $: [card()],
    } as DomphyElement);
    expect(rootEl.querySelector("h3")?.textContent).toBe("Card title");
    expect(rootEl.querySelector("p")?.textContent).toBe("Card body");
  });
});
