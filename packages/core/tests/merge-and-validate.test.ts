import { describe, expect, it } from "vitest";
import { validate } from "../src/helpers.ts";
import { merge } from "../src/utils.ts";

describe("merge", () => {
  it("deep-merges plain objects and keeps target immutable", () => {
    const source = { style: { color: "red" } };
    const target = { style: { fontWeight: "bold" } };

    const result = merge(source, target);

    expect(result).toBe(source);
    expect(result.style).toEqual({ color: "red", fontWeight: "bold" });
    expect(target).toEqual({ style: { fontWeight: "bold" } });
  });

  it("joins class/content/transition and chains event + hook handlers", () => {
    const eventOrder: string[] = [];
    const hookOrder: string[] = [];

    const source: Record<string, any> = {
      class: "a",
      transition: "opacity 120ms",
      content: "Hello",
      onClick: () => eventOrder.push("source"),
      _onMount: () => hookOrder.push("source"),
    };

    const target: Record<string, any> = {
      class: "b",
      transition: "transform 120ms",
      content: " world",
      onClick: () => eventOrder.push("target"),
      _onMount: () => hookOrder.push("target"),
    };

    merge(source, target);

    expect(source.class).toBe("a b");
    expect(source.transition).toBe("opacity 120ms, transform 120ms");
    expect(source.content).toBe("Hello world");

    source.onClick({}, {});
    source._onMount({});

    expect(eventOrder).toEqual(["source", "target"]);
    expect(hookOrder).toEqual(["source", "target"]);
  });

  it("ignores null/undefined/empty-string values", () => {
    const source: Record<string, any> = { title: "kept" };
    const target: Record<string, any> = {
      title: "",
      subtitle: undefined,
      desc: null,
    };

    merge(source, target);

    expect(source).toEqual({ title: "kept" });
  });

  it("joins comma-list keys reactively when the new value is a function", () => {
    const source: Record<string, any> = { transition: "opacity 120ms" };
    const target: Record<string, any> = {
      transition: () => "transform 120ms",
    };

    merge(source, target);

    expect(typeof source.transition).toBe("function");
    expect(source.transition({})).toBe("opacity 120ms, transform 120ms");
  });

  it("joins comma-list keys reactively when the old value is a function", () => {
    const source: Record<string, any> = { boxShadow: () => "0 0 1px red" };
    const target: Record<string, any> = { boxShadow: "0 0 2px blue" };

    merge(source, target);

    expect(typeof source.boxShadow).toBe("function");
    expect(source.boxShadow({})).toBe("0 0 1px red, 0 0 2px blue");
  });

  it("joins adjacent (content) keys reactively with no separator", () => {
    const source: Record<string, any> = { content: () => "Hello" };
    const target: Record<string, any> = { content: () => " world" };

    merge(source, target);

    expect(typeof source.content).toBe("function");
    expect(source.content({})).toBe("Hello world");
  });

  it("joins space-list (class) keys reactively with a space separator", () => {
    const source: Record<string, any> = { class: "base" };
    const target: Record<string, any> = { class: () => "active" };

    merge(source, target);

    expect(typeof source.class).toBe("function");
    expect(source.class({})).toBe("base active");
  });

  it("drops falsy parts from a reactive join", () => {
    const source: Record<string, any> = { transition: () => "" };
    const target: Record<string, any> = { transition: () => "color 1s" };

    merge(source, target);

    expect(source.transition({})).toBe("color 1s");
  });
});

describe("validate", () => {
  it("accepts valid partial elements", () => {
    const partial = {
      _onMount: () => {},
      onClick: () => {},
      style: { color: "red" },
    };

    expect(validate(partial as any, true)).toBe(true);
  });

  it("rejects invalid tags and invalid hook types", () => {
    expect(() => validate({ noSuchTag: "x" } as any)).toThrow(
      /not valid HTML tag/i,
    );
    expect(() => validate({ div: "x", _onMount: "bad" } as any)).toThrow(
      /must be a function/i,
    );
  });

  it("rejects an element object with no tag key instead of passing silently", () => {
    expect(() => validate({} as any)).toThrow(/no tag key/i);
  });

  it("rejects a dash-named (unsupported custom-element) first key", () => {
    expect(() => validate({ "my-widget": "hello" } as any)).toThrow(
      /not valid HTML tag/i,
    );
  });

  it("allows an empty object as a partial (asPartial=true)", () => {
    expect(validate({} as any, true)).toBe(true);
  });
});
