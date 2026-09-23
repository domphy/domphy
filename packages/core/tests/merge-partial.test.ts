import { describe, expect, it } from "vitest";
import { ElementNode, mergePartial } from "../src/index.js";

// `mergePartial` is the single definition of `$` composition order, and it is
// public so tooling (@domphy/doctor) can compose an element the way the runtime
// will instead of restating the rule. Truth source for these cases is the
// documented contract in AGENTS.md: "Patches via `$` ... Compose multiple ...
// The native element always wins over patch defaults."

describe("mergePartial", () => {
  it("lets the native element win over a patch default", () => {
    const merged = mergePartial({
      div: "x",
      id: "native",
      $: [{ id: "patch", title: "from patch" }],
    } as never) as Record<string, unknown>;
    expect(merged.id).toBe("native");
    expect(merged.title).toBe("from patch");
  });

  it("composes patches left to right", () => {
    const merged = mergePartial({
      div: "x",
      $: [{ title: "first" }, { title: "second" }],
    } as never) as Record<string, unknown>;
    expect(merged.title).toBe("second");
  });

  it("expands a patch that carries its own `$`", () => {
    const merged = mergePartial({
      div: "x",
      $: [{ $: [{ title: "nested" }], lang: "en" }],
    } as never) as Record<string, unknown>;
    expect(merged.title).toBe("nested");
    expect(merged.lang).toBe("en");
    expect(merged.$).toBeUndefined();
  });

  it("does not modify the element it is given", () => {
    const patch = { title: "from patch" };
    const element = { div: "x", id: "native", $: [patch] };
    const merged = mergePartial(element as never) as Record<string, unknown>;
    expect(merged).not.toBe(element);
    // The caller keeps its patches: re-expanding the same element (a memoized
    // descriptor, a shared patch object) must give the same result.
    expect(element.$).toEqual([patch]);
    expect(mergePartial(element as never)).toEqual(merged);
  });

  it("returns an element with no `$` untouched", () => {
    const element = { div: "x", id: "native" };
    expect(mergePartial(element as never)).toBe(element);
  });

  it("matches what ElementNode actually renders", () => {
    // The runtime path and the exported helper must not drift: whatever
    // mergePartial composes is what the node ends up carrying.
    const element = {
      div: "x",
      id: "native",
      $: [{ id: "patch", title: "from patch", lang: "en" }],
    };
    // No clone needed: mergePartial leaves its input alone (case above).
    const merged = mergePartial(element as never) as Record<string, unknown>;
    const html = new ElementNode(element as never).generateHTML();
    expect(html).toContain(`id="${merged.id}"`);
    expect(html).toContain(`title="${merged.title}"`);
    expect(html).toContain(`lang="${merged.lang}"`);
  });
});
