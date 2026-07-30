// @vitest-environment jsdom
//
// Regression coverage for the runtime hardening batch:
//  a. EffectScope.stop() runs ALL disposers even when one throws, then rethrows.
//  b. State.set() after dispose warns in DEV (and still no-ops).
//  c. ElementAttribute.addListener() subscriptions release via ONE guarded
//     BeforeRemove hook (the _removeHooked pattern) instead of composing a
//     hook per listener.
//  d. A non-array `$` throws an actionable error instead of a raw TypeError.
//  e. A void tag receiving content warns in DEV.
//  f. A behavior attach() throw routes to the nearest _onError boundary.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { effect, effectScope } from "../src/classes/Reactive.ts";
import type { DomphyElement } from "../src/types.ts";
import { behavior, toState } from "../src/utils.ts";

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  document.body.innerHTML = "";
});

describe("EffectScope.stop(): throwing disposer", () => {
  it("runs ALL disposers, clears the set, then rethrows the first error", () => {
    const scope = effectScope();
    const calls: string[] = [];
    (scope as any)._add(() => {
      calls.push("first");
      throw new Error("boom-1");
    });
    (scope as any)._add(() => {
      calls.push("second");
      throw new Error("boom-2");
    });
    (scope as any)._add(() => {
      calls.push("third");
    });

    expect(() => scope.stop()).toThrow("boom-1");
    expect(calls).toEqual(["first", "second", "third"]);
    // Additional errors are logged, not swallowed silently.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("effectScope.stop()"),
      expect.any(Error),
    );
    // The set was cleared: a second stop() is a no-op, not another throw.
    expect(() => scope.stop()).not.toThrow();
  });

  it("still disposes real effects registered after the thrower", () => {
    const source = toState(0);
    const scope = effectScope();
    const seen: number[] = [];
    (scope as any)._add(() => {
      throw new Error("boom");
    });
    scope.run(() => {
      effect(() => {
        seen.push(source.get());
      });
    });

    expect(() => scope.stop()).toThrow("boom");
    source.set(1);
    expect(seen).toEqual([0]); // the effect was disposed despite the throw
  });
});

describe("State.set() after dispose", () => {
  it("warns in DEV and stays a no-op", () => {
    const state = toState(1);
    state._dispose();
    state.set(2);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("disposed state"),
    );
    expect(state.get()).toBe(1); // value untouched
  });
});

describe("ElementAttribute.addListener(): guarded release", () => {
  it("releases all attribute listeners on node removal", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({
      div: "x",
      title: "t",
    } as DomphyElement);
    node.render(host);

    const attr = node.attributes.items!.title;
    attr.addListener(() => {});
    attr.addListener(() => {});
    expect(attr._notifier.listenerCount("title")).toBe(2);

    node.remove();
    expect(attr._notifier.listenerCount("title")).toBe(0);
  });
});

describe("non-array $", () => {
  it("throws an actionable error naming the element and what was received", () => {
    expect(() => new ElementNode({ div: "x", $: {} } as any)).toThrow(
      /"\$" must be an array of patch objects, received object/,
    );
    expect(() => new ElementNode({ div: "x", $: "patch()" } as any)).toThrow(
      /received string/,
    );
  });
});

describe("void-tag content", () => {
  it("warns in DEV when a void element declares children", () => {
    new ElementNode({ img: "alt text" } as any);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("<img> is a void element"),
    );
  });

  it("does not warn for void elements with null content", () => {
    new ElementNode({ img: null } as any);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for the empty-string idiom ({ hr: \"\" })", () => {
    new ElementNode({ hr: "" } as any);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not warn for non-void elements with content", () => {
    new ElementNode({ div: "content" } as any);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("behavior attach() throw", () => {
  it("routes the error to the nearest _onError boundary instead of throwing uncaught", () => {
    const errors: unknown[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);

    expect(() =>
      new ElementNode({
        div: "x",
        _onError: (_node: any, error: unknown) => errors.push(error),
        $: [
          behavior(
            "failing",
            () => {
              throw new Error("attach failed");
            },
            {},
          ),
        ],
      } as any).render(host),
    ).not.toThrow();

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("attach failed");
  });

  it("falls back to console.error when no boundary exists", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);

    expect(() =>
      new ElementNode({
        div: "x",
        $: [
          behavior(
            "failing",
            () => {
              throw new Error("attach failed");
            },
            {},
          ),
        ],
      } as any).render(host),
    ).not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Domphy]"),
      expect.any(Error),
    );
  });
});
