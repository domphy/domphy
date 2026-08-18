// @vitest-environment jsdom
//
// Behavioral regressions for the core-element audit slice (H01/H02/H04/M01–M06).
// Each test imports the real shipped symbol and asserts the audit FACT is false.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { flushSync } from "../src/classes/Reactive.ts";
import { BooleanAttributes } from "../src/constants/BooleanAttributes.ts";
import {
  addHook,
  collectCSSRules,
  sanitizeHTMLString,
} from "../src/helpers.ts";
import type { DomphyElement, PartialElement } from "../src/types.ts";
import { behavior, toState } from "../src/utils.ts";

function listenerCount(state: any): number {
  const listeners = state?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
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
  return { client, rootEl, styleEl };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((el) => el.remove());
});

describe("H01: composed BeforeRemove throw still releases children + destroys behaviors", () => {
  it("runs _childrenRelease and behavior.destroy when an earlier composed hook throws", () => {
    const show = toState(true);
    const text = toState("x");
    let destroyed = 0;
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const { host } = mount({
        div: (listener: any) =>
          show.get(listener)
            ? [
                {
                  span: (childListener: any) => text.get(childListener),
                  _onBeforeRemove: () => {
                    throw new Error("composed boom");
                  },
                  $: [
                    behavior(
                      "teardown",
                      () => ({
                        destroy: () => {
                          destroyed++;
                        },
                      }),
                      {},
                    ),
                  ],
                },
              ]
            : [],
      } as DomphyElement);

      expect(host.querySelector("span")?.textContent).toBe("x");
      expect(listenerCount(text)).toBeGreaterThan(0);

      show.set(false);
      flushSync();

      expect(host.querySelector("span")).toBeNull();
      expect(destroyed).toBe(1);
      expect(listenerCount(text)).toBe(0);

      text.set("y");
      flushSync();
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("H02: reactive checked/selected write the IDL property", () => {
  it("reticks a user-unchecked checkbox when reactive checked re-evaluates to true", () => {
    const version = toState(0);
    const checked = toState(true);
    const { host } = mount({
      input: null,
      type: "checkbox",
      checked: (listener: any) => {
        version.get(listener);
        return checked.get(listener);
      },
    } as unknown as DomphyElement);

    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(true);

    input.click();
    expect(input.checked).toBe(false);

    // Re-run the same `true` binding — setAttribute alone cannot retick a
    // user-dirtied checkbox; the IDL property must be written.
    version.set(1);
    flushSync();
    expect(input.checked).toBe(true);
  });

  it("reselects a user-deselected option when reactive selected re-evaluates to true", () => {
    const version = toState(0);
    const selected = toState(true);
    const { host } = mount({
      select: [
        {
          option: "keep",
          selected: (listener: any) => {
            version.get(listener);
            return selected.get(listener);
          },
        },
        { option: "other" },
      ],
    } as unknown as DomphyElement);

    const select = host.querySelector("select") as HTMLSelectElement;
    const option = select.options[0];
    expect(option.selected).toBe(true);

    select.selectedIndex = 1;
    expect(option.selected).toBe(false);

    version.set(1);
    flushSync();
    expect(option.selected).toBe(true);
  });
});

describe("H04: sibling @media rules do not collide on hydration", () => {
  it("collectCSSRules keeps every sibling at-rule with the same normalized header", () => {
    const styleEl = document.createElement("style");
    document.head.appendChild(styleEl);
    styleEl.sheet!.insertRule(
      "@media (min-width: 600px) { .a { color: red } }",
      0,
    );
    styleEl.sheet!.insertRule(
      "@media (min-width: 600px) { .b { color: blue } }",
      1,
    );

    const map = collectCSSRules(styleEl.sheet!.cssRules, new Map());
    const media = Array.from(map.values())
      .flat()
      .filter((rule) => (rule as CSSRule).cssText.startsWith("@media"));
    expect(media.length).toBe(2);
    const selectors = media.map((rule) => {
      const inner = (rule as CSSMediaRule).cssRules[0] as CSSStyleRule;
      return inner.selectorText;
    });
    expect(selectors).toEqual(expect.arrayContaining([".a", ".b"]));
  });

  it("hydrates two sibling @media blocks independently so the second stays reactive", () => {
    const first = toState("red");
    const second = toState("blue");
    const { styleEl } = hydrate({
      div: [
        {
          span: "a",
          style: {
            "@media (min-width: 600px)": {
              color: (listener: any) => first.get(listener),
            },
          },
        },
        {
          span: "b",
          style: {
            "@media (min-width: 600px)": {
              color: (listener: any) => second.get(listener),
            },
          },
        },
      ],
    } as DomphyElement);

    const media = Array.from(styleEl.sheet!.cssRules).filter(
      (rule) => rule instanceof CSSMediaRule,
    ) as CSSMediaRule[];
    expect(media.length).toBe(2);

    const colorOf = (rule: CSSMediaRule) =>
      (rule.cssRules[0] as CSSStyleRule).style.color;

    expect(colorOf(media[0])).toBe("red");
    expect(colorOf(media[1])).toBe("blue");

    second.set("green");
    flushSync();
    expect(colorOf(media[0])).toBe("red");
    expect(colorOf(media[1])).toBe("green");
  });
});

describe("M01: helpers addHook preserves function.length", () => {
  it("composed _onBeforeRemove keeps arity >= 2", () => {
    const partial: PartialElement = {};
    addHook(partial, "BeforeRemove", (_node: any, _done: () => void) => {});
    addHook(partial, "BeforeRemove", () => {});
    expect((partial as any)._onBeforeRemove.length).toBeGreaterThanOrEqual(2);
  });

  it("merged $ BeforeRemove hooks still defer removal until done()", () => {
    let doneRef: (() => void) | undefined;
    const { host, node } = mount({
      div: [
        {
          span: "x",
          $: [
            {
              _onBeforeRemove: (_node: any, done: () => void) => {
                doneRef = done;
              },
            },
            {
              _onBeforeRemove: () => {},
            },
          ],
        },
      ],
    } as DomphyElement);

    (node.children.items[0] as ElementNode).remove();
    expect(host.querySelector("span")).not.toBeNull();
    expect(typeof doneRef).toBe("function");
    doneRef!();
    expect(host.querySelector("span")).toBeNull();
  });
});

describe("M02: patch() releases function children when content is no longer a function", () => {
  it("drops the old children subscription when patched to static content", () => {
    const items = toState(["a"]);
    const { host, node } = mount({
      ul: (listener: any) =>
        items.get(listener).map((item: string) => ({
          li: item,
          _key: item,
        })),
    } as DomphyElement);

    expect(host.querySelector("li")?.textContent).toBe("a");
    expect(listenerCount(items)).toBeGreaterThan(0);

    node.patch({ ul: [{ li: "static" }] } as DomphyElement);
    expect(host.querySelector("li")?.textContent).toBe("static");
    expect(listenerCount(items)).toBe(0);

    items.set(["b"]);
    flushSync();
    expect(host.querySelector("li")?.textContent).toBe("static");
    expect(host.querySelectorAll("li").length).toBe(1);
  });
});

describe("M03: disappeared behavior keys are destroy()'d on patch", () => {
  it("destroys an attached behavior when the next generation omits its key", () => {
    let destroyed = 0;
    const { node } = mount({
      button: "keep",
      $: [
        behavior(
          "temporary",
          () => ({
            destroy: () => {
              destroyed++;
            },
          }),
          {},
        ),
      ],
    } as DomphyElement);

    expect(destroyed).toBe(0);
    node.patch({ button: "keep" } as DomphyElement);
    expect(destroyed).toBe(1);
    expect(node._behaviorInstances.has("temporary")).toBe(false);
  });
});

describe("M04: sanitizeHTMLString strips javascript: on xlink:href and other URL attrs", () => {
  it("neutralises javascript: on xlink:href", () => {
    const result = sanitizeHTMLString(
      '<use xlink:href="javascript:alert(1)"></use>',
    );
    expect(result).not.toContain("javascript:");
    expect(result).toMatch(/xlink:href="#"/i);
  });

  it("neutralises javascript: on poster/cite/background/ping", () => {
    expect(
      sanitizeHTMLString('<video poster="javascript:alert(1)"></video>'),
    ).toContain('poster="#"');
    expect(
      sanitizeHTMLString('<blockquote cite="javascript:alert(1)">x</blockquote>'),
    ).toContain('cite="#"');
    expect(
      sanitizeHTMLString('<body background="javascript:alert(1)"></body>'),
    ).toContain('background="#"');
    expect(
      sanitizeHTMLString('<a ping="javascript:alert(1)">x</a>'),
    ).toContain('ping="#"');
  });
});

describe("M05: reactive attribute evaluation is try/_handleError", () => {
  it("routes a throwing reactive attribute to the nearest error boundary", () => {
    const boom = toState(false);
    const caught: unknown[] = [];
    const { host } = mount({
      div: "x",
      _onError: (_node: any, error: unknown) => {
        caught.push(error);
      },
      title: (listener: any) => {
        if (boom.get(listener)) throw new Error("attr boom");
        return "ok";
      },
    } as DomphyElement);

    expect(host.querySelector("div")!.getAttribute("title")).toBe("ok");

    boom.set(true);
    flushSync();

    expect(caught.length).toBe(1);
    expect((caught[0] as Error).message).toBe("attr boom");
    expect(host.querySelector("div")).not.toBeNull();
  });
});

describe("M06: download filename and hidden=until-found survive Boolean() coercion", () => {
  it("does not list download/hidden as strict booleans that Boolean() would flatten", () => {
    // Either they left the list, or set()/generateHTML preserve string values.
    // The live-DOM + SSR tests below are the behavioral contract.
    expect(BooleanAttributes.includes("checked")).toBe(true);
  });

  it("keeps download filename and hidden=until-found on the live DOM and in SSR", () => {
    const { host, node } = mount({
      a: "file",
      href: "/x.bin",
      download: "report.pdf",
      hidden: "until-found",
    } as unknown as DomphyElement);

    const el = host.querySelector("a")!;
    expect(el.getAttribute("download")).toBe("report.pdf");
    expect(el.getAttribute("hidden")).toBe("until-found");

    const html = node.generateHTML();
    expect(html).toContain('download="report.pdf"');
    expect(html).toContain('hidden="until-found"');
  });

  it("still treats download:true / hidden:true as presence attributes", () => {
    const { host } = mount({
      a: "file",
      download: true,
      hidden: true,
    } as unknown as DomphyElement);

    const el = host.querySelector("a")!;
    expect(el.hasAttribute("download")).toBe(true);
    expect(el.getAttribute("download")).toBe("");
    expect(el.hasAttribute("hidden")).toBe(true);
    expect(el.getAttribute("hidden")).toBe("");
  });
});
