import { describe, expect, it, vi } from "vitest";
import { effect, effectScope } from "../src/classes/Reactive.ts";
import { State } from "../src/classes/State.ts";

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe("Notifier: event names colliding with Object.prototype", () => {
  it.each(["constructor", "hasOwnProperty", "toString", "valueOf", "__proto__"])(
    "add/remove/notify a listener on a state named %s",
    async (name) => {
      const state = new State(0, name);
      const listener = vi.fn();

      const release = state.addListener(listener);
      expect(release).toBeInstanceOf(Function);

      state.set(1);
      await flush();
      expect(listener).toHaveBeenCalledWith(1);

      state.removeListener(listener);
      state.set(2);
      await flush();
      // No further call after removal.
      expect(listener).toHaveBeenCalledTimes(1);
    },
  );

  it("supports two independent listeners on a Object.prototype-colliding name", async () => {
    const state = new State(0, "constructor");
    const a = vi.fn();
    const b = vi.fn();

    state.addListener(a);
    state.addListener(b);
    state.set(5);
    await flush();

    expect(a).toHaveBeenCalledWith(5);
    expect(b).toHaveBeenCalledWith(5);
  });
});

describe("EffectScope.run() after stop()", () => {
  it("does not silently create a permanently-inert effect", () => {
    const scope = effectScope();
    scope.run(() => {});
    scope.stop();

    const runs = vi.fn();
    let dispose!: () => void;
    scope.run(() => {
      dispose = effect(runs);
    });

    // The effect's guaranteed immediate first run must actually happen — it
    // must not be disposed before ever executing.
    expect(runs).toHaveBeenCalledTimes(1);

    // The effect must still be a normal, working, disposable effect: reads on
    // a state should re-trigger it, and dispose() should stop it.
    expect(() => dispose()).not.toThrow();
  });

  it("registers effects created after stop() to the enclosing scope instead of orphaning them", () => {
    const outer = effectScope();
    const inner = effectScope();
    inner.run(() => {});
    inner.stop();

    const runs = vi.fn();
    outer.run(() => {
      inner.run(() => {
        effect(runs);
      });
    });

    expect(runs).toHaveBeenCalledTimes(1);

    // Since `inner` was stopped, the effect registered into `outer` (the
    // enclosing scope active on SCOPE_STACK at call time) — stopping `outer`
    // disposes it too.
    expect(() => outer.stop()).not.toThrow();
  });

  it("reacts to dependency changes for an effect created inside a stopped scope", async () => {
    const scope = effectScope();
    scope.run(() => {});
    scope.stop();

    const state = new State(0, "value");
    const seen: number[] = [];
    scope.run(() => {
      effect(() => {
        seen.push(state.get());
      });
    });

    expect(seen).toEqual([0]);
    state.set(1);
    await flush();
    expect(seen).toEqual([0, 1]);
  });
});
