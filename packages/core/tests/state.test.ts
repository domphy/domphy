import { describe, expect, it, vi } from "vitest";
import { State } from "../src/classes/State.ts";
import { toState } from "../src/utils.ts";

describe("State / toState", () => {
  it("wraps plain values and keeps State instances intact", () => {
    const state = toState(1);
    const same = toState(state);

    expect(state).toBeInstanceOf(State);
    expect(same).toBe(state);
  });

  it("subscribes via get(listener) and notifies on set", async () => {
    const state = new State(0);
    const listener = vi.fn();

    expect(state.get(listener as any)).toBe(0);
    state.set(2);
    await new Promise<void>(r => queueMicrotask(r));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });

  it("supports onChange release and reset", async () => {
    const state = new State(3);
    const listener = vi.fn();
    const release = state.addListener(listener as any);

    state.set(4);
    await new Promise<void>(r => queueMicrotask(r));
    release();
    state.set(5);
    await new Promise<void>(r => queueMicrotask(r));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(state.get()).toBe(5);

    state.reset();
    expect(state.get()).toBe(3);
  });

  it("stops notifying after dispose", () => {
    const state = new State(10);
    const listener = vi.fn();

    state.addListener(listener as any);
    state._dispose();
    state.set(11);

    expect(listener).not.toHaveBeenCalled();
  });
});

