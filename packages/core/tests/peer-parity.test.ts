// @vitest-environment jsdom
// Behaviors pinned against sources OUTSIDE this codebase:
//  - Vue 3 `watch`: only the source is tracked, never the callback
//    (https://vuejs.org/guide/essentials/watchers.html)
//  - Svelte 5 `$effect` / Preact-signals `effect`: a function returned from the
//    effect body is the teardown, run before each re-run and once on dispose
//  - Solid `createEffect` owner: reactive resources created during a run are
//    disposed when that run is superseded
//  - `Element.setAttribute()` / the XML Name production: an attribute name that
//    the DOM rejects must not be serialized by SSR either
//  - CSS cascade: an author `display` beats the UA's `[hidden] { display: none }`
//  - HTML Standard §4.4.3 / §4.10.11: the parser drops a single newline placed
//    immediately after a <pre> / <textarea> start tag
import { describe, expect, it, vi } from "vitest";
import {
  computed,
  ElementNode,
  effect,
  flushSync,
  toState,
  watch,
} from "../src/index.ts";

describe("Vue 3 watch semantics: only the source is tracked", () => {
  it("a read inside the callback does not become a watcher dependency", () => {
    const source = toState(0);
    const unrelated = toState("a");
    const calls: string[] = [];
    watch(source, (n) => {
      calls.push(`${n}:${unrelated.get()}`);
    });

    source.set(1);
    flushSync();
    expect(calls).toEqual(["1:a"]);

    unrelated.set("b");
    flushSync();
    expect(calls).toEqual(["1:a"]);
  });
});

describe("Svelte 5 / Preact-signals effect teardown", () => {
  it("runs the returned cleanup before each re-run and once on dispose", () => {
    const value = toState(0);
    const cleanups: number[] = [];
    const dispose = effect(() => {
      const current = value.get();
      return () => cleanups.push(current);
    });

    expect(cleanups).toEqual([]);
    value.set(1);
    flushSync();
    expect(cleanups).toEqual([0]);

    dispose();
    expect(cleanups).toEqual([0, 1]);
    dispose();
    expect(cleanups).toEqual([0, 1]);
  });

  it("does not treat a non-function return as a teardown", () => {
    const value = toState(0);
    expect(() => {
      const dispose = effect(() => {
        value.get();
        return 42 as unknown as undefined;
      });
      value.set(1);
      flushSync();
      dispose();
    }).not.toThrow();
  });
});

describe("Solid owner semantics: a run owns what it creates", () => {
  it("a nested effect is disposed when the outer effect re-runs", () => {
    const outer = toState(0);
    const inner = toState(0);
    const innerRuns = vi.fn();

    effect(() => {
      outer.get();
      effect(() => {
        inner.get();
        innerRuns();
      });
    });

    outer.set(1);
    flushSync();
    innerRuns.mockClear();

    inner.set(1);
    flushSync();
    // Exactly one live inner effect, not one per outer generation.
    expect(innerRuns).toHaveBeenCalledTimes(1);
  });
});

describe("computed equality matches State.set (Object.is)", () => {
  it("a computed resolving to NaN does not notify on every dependency write", () => {
    const source = toState(1);
    const nan = computed(() => {
      source.get();
      return Number.NaN;
    });
    const notified = vi.fn();
    nan.get(notified);

    source.set(2);
    flushSync();
    expect(notified).not.toHaveBeenCalled();
  });
});

describe("attribute names must satisfy the XML Name production", () => {
  it("a name the DOM would reject is dropped, not serialized into SSR output", () => {
    const hostile = { 'x" onmouseover="alert(1)': "y" } as Record<string, any>;
    const descriptor = { div: "hi", ...hostile } as any;

    const html = new ElementNode(descriptor).generateHTML();
    expect(html).not.toContain("onmouseover");

    // The same descriptor must not throw InvalidCharacterError on the client.
    const node = new ElementNode(descriptor);
    expect(() => node.render(document.createElement("div"))).not.toThrow();
  });

  it("real attribute names still pass", () => {
    const html = new ElementNode({
      div: "hi",
      id: "a",
      ariaLabel: "b",
      "data-x": "c",
      tabIndex: 0,
    } as any).generateHTML();
    expect(html).toContain('id="a"');
    expect(html).toContain('aria-label="b"');
    expect(html).toContain('data-x="c"');
    expect(html).toContain('tabindex="0"');
  });
});

describe("SSR stylesheet carries the same base rule as the client", () => {
  it("[hidden] wins over an author display in server-rendered CSS", () => {
    const css = new ElementNode({
      div: "x",
      hidden: true,
      style: { display: "flex" },
    } as any).generateCSS();
    expect(css).toContain("[hidden]");
    expect(css).toContain("display: none !important");
  });
});

// The expected value is the REAL parser's output: the SSR string is fed to
// the browser's HTML parser and compared with what the client render path
// produces for the same tree.
describe("HTML parser drops the first newline after <pre>/<textarea>", () => {
  it("SSR output parses back to the same text the client renders", () => {
    const descriptor = { pre: "\nfirst\nsecond" } as any;

    const parsed = document.createElement("div");
    parsed.innerHTML = new ElementNode(descriptor).generateHTML();

    const client = document.createElement("div");
    new ElementNode(descriptor).render(client);

    expect(parsed.firstElementChild?.textContent).toBe("\nfirst\nsecond");
    expect(parsed.firstElementChild?.textContent).toBe(
      client.firstElementChild?.textContent,
    );
  });

  it("a textarea's server-rendered value keeps its leading newline", () => {
    const host = document.createElement("div");
    host.innerHTML = new ElementNode({
      textarea: "\nvalue",
    } as any).generateHTML();
    expect((host.firstElementChild as HTMLTextAreaElement).value).toBe(
      "\nvalue",
    );
  });

  it("content that does not start with a newline is untouched", () => {
    const html = new ElementNode({
      pre: "first\nsecond",
    } as any).generateHTML();
    expect(html).toContain(">first\nsecond<");
  });
});

describe("Mount fires bottom-up on both render paths", () => {
  it("children mount before their parent on a fresh render, as on hydration", () => {
    const order: string[] = [];
    const tree = () =>
      ({
        div: [
          {
            section: [{ span: "x", _onMount: () => order.push("grandchild") }],
            _onMount: () => order.push("child"),
          },
        ],
        _onMount: () => order.push("parent"),
      }) as any;

    new ElementNode(tree()).render(document.createElement("div"));
    const rendered = order.slice();
    expect(rendered).toEqual(["grandchild", "child", "parent"]);

    order.length = 0;
    const server = new ElementNode(tree());
    const host = document.createElement("div");
    host.innerHTML = server.generateHTML();
    new ElementNode(tree()).mount(host.firstElementChild as HTMLElement);
    expect(order).toEqual(rendered);
  });
});

// Truth source: the SVG 1.1 / SVG 2 attribute tables. `attributeName`,
// `repeatCount`, `calcMode`… are camelCase in the spec; `marker-start` and
// `color-interpolation-filters` are kebab-case. SVG ignores a name it does not
// recognise, so a serializer that picks the wrong casing renders an inert
// attribute with no error anywhere.
describe("SVG attribute casing follows the SVG spec", () => {
  const emitted = (element: Record<string, unknown>) =>
    new ElementNode(element as any).generateHTML();

  it("keeps spec-camelCase SMIL and filter attributes verbatim", () => {
    const html = emitted({
      animateTransform: null,
      attributeName: "gradientTransform",
      attributeType: "XML",
      repeatCount: "indefinite",
      repeatDur: "30s",
      calcMode: "spline",
      keyTimes: "0;1",
      keySplines: "0 0 1 1",
    });
    expect(html).toContain('attributeName="gradientTransform"');
    expect(html).toContain('attributeType="XML"');
    expect(html).toContain('repeatCount="indefinite"');
    expect(html).toContain('repeatDur="30s"');
    expect(html).toContain('calcMode="spline"');
    expect(html).toContain('keyTimes="0;1"');
    expect(html).toContain('keySplines="0 0 1 1"');
    expect(html).not.toContain("attribute-name");
    expect(html).not.toContain("repeat-count");
  });

  it("kebab-cases the spec's kebab-case presentation attributes", () => {
    const html = emitted({
      path: null,
      markerStart: "url(#a)",
      markerEnd: "url(#b)",
      colorInterpolationFilters: "sRGB",
      alignmentBaseline: "middle",
    });
    expect(html).toContain('marker-start="url(#a)"');
    expect(html).toContain('marker-end="url(#b)"');
    expect(html).toContain('color-interpolation-filters="sRGB"');
    expect(html).toContain('alignment-baseline="middle"');
  });

  it("still emits the <marker> element's own camelCase attributes", () => {
    const html = emitted({
      marker: null,
      markerWidth: "6",
      markerHeight: "6",
      markerUnits: "strokeWidth",
      refX: "3",
    });
    expect(html).toContain('markerWidth="6"');
    expect(html).toContain('markerUnits="strokeWidth"');
    expect(html).toContain('refX="3"');
  });
});

// `_doctorDisable` (and every other `_`-prefixed descriptor prop) is a
// framework instruction, not an HTML/SVG attribute — no spec defines it, so it
// must never reach the document on either render path.
describe("framework-internal props never reach the DOM", () => {
  it("_doctorDisable is absent from SSR output and from the rendered element", () => {
    const descriptor = {
      stop: null,
      offset: "0%",
      _doctorDisable: "missing-color",
    } as any;

    expect(new ElementNode(descriptor).generateHTML()).not.toMatch(/_doctor/i);

    const host = document.createElement("div");
    new ElementNode(descriptor).render(host);
    const rendered = host.firstElementChild as Element;
    expect(rendered.getAttributeNames()).not.toContain("_doctor-disable");
    expect(rendered.getAttribute("offset")).toBe("0%");
  });

  it("stays absent after a patch() reuse", () => {
    const host = document.createElement("div");
    const node = new ElementNode({
      stop: null,
      offset: "0%",
      _doctorDisable: true,
    } as any);
    node.render(host);
    node.patch({ stop: null, offset: "50%", _doctorDisable: true } as any);
    const rendered = host.firstElementChild as Element;
    expect(rendered.getAttributeNames()).not.toContain("_doctor-disable");
    expect(rendered.getAttribute("offset")).toBe("50%");
  });
});
