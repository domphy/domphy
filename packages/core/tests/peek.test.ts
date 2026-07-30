// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { computed, effect } from "../src/classes/Reactive.ts";
import type { Listener } from "../src/types.ts";
import { peek, toState } from "../src/utils.ts";

// Flush several microtask turns so notifier flush + reaction drain settle.
async function settle(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
}

describe("peek", () => {
  it("reads a reactive function without a listener", () => {
    const disabled = toState(true);
    const read = (l: Listener) => disabled.get(l as any);
    expect(peek(read)).toBe(true);
    disabled.set(false);
    expect(peek(read)).toBe(false);
  });

  it("subscribes nothing on the read states", () => {
    const state = toState(1);
    peek((l) => state.get(l as any));
    expect((state as any)._notifier._listeners.number?.size ?? 0).toBe(0);
  });

  it("does not become a dependency of an enclosing effect", async () => {
    const peeked = toState(0);
    const tracked = toState(0);
    const spy = vi.fn();
    const dispose = effect(() => {
      spy();
      tracked.get();
      peek((l) => peeked.get(l as any));
    });
    const runs = spy.mock.calls.length;
    peeked.set(1);
    await settle();
    expect(spy.mock.calls.length).toBe(runs);
    tracked.set(1);
    await settle();
    expect(spy.mock.calls.length).toBe(runs + 1);
    dispose();
  });

  it("reads a computed through the same path", () => {
    const base = toState(2);
    const doubled = computed(() => base.get() * 2);
    expect(peek((l) => doubled.get(l as any))).toBe(4);
  });
});
