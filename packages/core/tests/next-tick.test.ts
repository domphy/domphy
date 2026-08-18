// M07: nextTick must resolve only after scheduled reactions have flushed.
// Promise.resolve() is the same checkpoint as the notifier flush, which
// merely *schedules* effect/computed jobs — those run one microtask later.
import { describe, expect, it } from "vitest";
import { effect, nextTick, toState } from "../src/index.ts";

describe("nextTick", () => {
  it("resolves after a state write's effects have re-run", async () => {
    const count = toState(0, "nt-count");
    let seen = -1;
    effect(() => {
      seen = count.get();
    });
    expect(seen).toBe(0);

    count.set(1);
    await nextTick();
    expect(seen).toBe(1);
  });

  it("invokes the optional callback after effects have re-run", async () => {
    const count = toState(0, "nt-cb");
    let seen = -1;
    effect(() => {
      seen = count.get();
    });

    count.set(7);
    let callbackSeen = -1;
    await nextTick(() => {
      callbackSeen = seen;
    });
    expect(callbackSeen).toBe(7);
    expect(seen).toBe(7);
  });

  it("still settles a write scheduled after nextTick is called", async () => {
    const count = toState(0, "nt-late");
    let seen = -1;
    effect(() => {
      seen = count.get();
    });

    const pending = nextTick();
    count.set(3);
    await pending;
    expect(seen).toBe(3);
  });
});
