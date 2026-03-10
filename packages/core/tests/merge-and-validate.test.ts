import { describe, expect, it, vi } from "vitest";
import { merge } from "../src/utils.ts";
import { validate } from "../src/helpers.ts";

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
    expect(() => validate({ noSuchTag: "x" } as any)).toThrow(/not valid HTML tag/i);
    expect(() => validate({ div: "x", _onMount: "bad" } as any)).toThrow(/must be a function/i);
  });
});

