// M11: State.set / RecordState.set must skip notify when Object.is(prev, next)
// so `a.set(a.get())` cannot schedule a self-loop.
import { describe, expect, it, vi } from "vitest";
import {
  effect,
  flushSync,
  RecordState,
  State,
  toState,
} from "../src/index.ts";

describe("State.set: Object.is bail-out", () => {
  it("does not notify when the new value is Object.is-equal", () => {
    const state = new State(1, "bail");
    const listener = vi.fn();
    state.addListener(listener as any);

    state.set(1);
    flushSync();
    expect(listener).not.toHaveBeenCalled();
    expect(state.get()).toBe(1);
  });

  it("a.set(a.get()) does not re-run an effect", () => {
    const a = toState(4, "loop");
    let runs = 0;
    effect(() => {
      runs++;
      a.get();
    });
    expect(runs).toBe(1);

    a.set(a.get());
    flushSync();
    expect(runs).toBe(1);
  });

  it("still notifies when the value changes", () => {
    const state = new State(1, "change");
    const listener = vi.fn();
    state.addListener(listener as any);
    state.set(2);
    flushSync();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });

  it("treats NaN as equal to NaN (Object.is)", () => {
    const state = new State(Number.NaN, "nan");
    const listener = vi.fn();
    state.addListener(listener as any);
    state.set(Number.NaN);
    flushSync();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("RecordState.set: Object.is bail-out", () => {
  it("does not notify when the key is set to the same value", () => {
    const record = new RecordState({ n: 1 });
    const listener = vi.fn();
    record.addListener("n", listener);

    record.set("n", 1);
    flushSync();
    expect(listener).not.toHaveBeenCalled();
    expect(record.get("n")).toBe(1);
  });

  it("still notifies when the key changes", () => {
    const record = new RecordState({ n: 1 });
    const listener = vi.fn();
    record.addListener("n", listener);
    record.set("n", 2);
    flushSync();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });
});
