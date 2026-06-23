// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  effect,
  effectScope,
  flushSync,
} from "../src/classes/Reactive.ts";
import { State } from "../src/classes/State.ts";

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

// Repeated microtask turns so multi-hop propagation (computed -> Notifier
// microtask -> downstream) fully settles, mirroring reactive.test.ts.
async function settle(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) await flush();
}

// Sum of all listener-set sizes on a State's (or computed's) internal Notifier.
function listenerCount(source: any): number {
  const listeners = source?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("computed: standalone dispose via effectScope.stop", () => {
  it("releases upstream + downstream subscriptions and stops recomputing", async () => {
    const a = new State(1, "a");
    const recomputes = vi.fn();
    const downstream = vi.fn();

    const scope = effectScope();
    let derived!: ReturnType<typeof computed<number>>;
    scope.run(() => {
      derived = computed(() => {
        recomputes();
        return a.get() * 2;
      });
    });

    // Observe the computed so a dependency change eagerly recomputes + notifies.
    derived.get(downstream as any);
    expect(derived.get()).toBe(2);
    expect(recomputes).toHaveBeenCalledTimes(1);
    expect(listenerCount(a)).toBe(1); // computed subscribes to its dependency
    expect(listenerCount(derived)).toBe(1); // downstream subscribes to computed

    a.set(5);
    await settle();
    expect(derived.get()).toBe(10);
    expect(downstream).toHaveBeenCalledWith(10);
    const recomputesBeforeStop = recomputes.mock.calls.length;

    scope.stop();
    // Upstream dependency subscription released → no leak.
    expect(listenerCount(a)).toBe(0);

    a.set(99);
    await settle();
    // No further recompute and no further downstream notification after dispose.
    expect(recomputes).toHaveBeenCalledTimes(recomputesBeforeStop);
    expect(downstream).toHaveBeenLastCalledWith(10);
  });
});

describe("flushSync: guard-overflow on a non-settling reaction", () => {
  it("breaks at the iteration guard, logs, and returns without hanging", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // A diverging effect: it both reads and writes a state to a value that keeps
    // changing, so the reaction never reaches a fixpoint. The Notifier self-update
    // cap stops the per-state feedback, but the cross-layer flushSync loop is what
    // we exercise here — it must hit its 10000 guard and break instead of looping
    // forever.
    const a = new State(0, "diverge");
    const dispose = effect(() => {
      // Always set to a different value than the current one read.
      a.set(a.get() + 1);
    });

    const start = Date.now();
    expect(() => flushSync()).not.toThrow();
    const elapsed = Date.now() - start;

    // It returned (did not hang). Generous bound: the guard is bounded work.
    expect(elapsed).toBeLessThan(5000);
    // Either the flushSync guard or the Notifier self-update cap logged.
    expect(errorSpy).toHaveBeenCalled();

    dispose();
    errorSpy.mockRestore();
  });
});
