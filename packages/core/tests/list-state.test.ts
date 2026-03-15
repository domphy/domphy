import { describe, expect, it, vi } from "vitest";
import { ListState } from "../src/classes/ListState.ts";
import { State } from "../src/classes/State.ts";
import { toListState } from "../src/utils.ts";

describe("toListState", () => {
  it("wraps plain arrays and keeps ListState instances intact", () => {
    const list = toListState([1, 2, 3]);
    const same = toListState(list);

    expect(list).toBeInstanceOf(ListState);
    expect(same).toBe(list);
  });

  it("creates one State per item", () => {
    const list = toListState(["a", "b"]);
    const states = list.states();

    expect(states).toHaveLength(2);
    expect(states[0]).toBeInstanceOf(State);
    expect(states[0].get()).toBe("a");
    expect(states[1].get()).toBe("b");
  });
});

describe("ListState entries / states / keys", () => {
  it("entries returns key+state pairs", () => {
    const list = new ListState([10, 20]);
    const entries = list.entries();

    expect(entries).toHaveLength(2);
    expect(typeof entries[0].key).toBe("number");
    expect(entries[0].state.get()).toBe(10);
  });

  it("keys are unique and monotonically increasing", () => {
    const list = new ListState([1, 2, 3]);
    const keys = list.keys();

    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBeLessThan(keys[1]);
    expect(keys[1]).toBeLessThan(keys[2]);
  });

  it("subscribes listener via entries(listener)", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.entries(listener as any);
    list.insert(2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribes listener via states(listener)", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.states(listener as any);
    list.insert(2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("subscribes listener via keys(listener)", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.keys(listener as any);
    list.insert(2);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ListState insert", () => {
  it("appends item and returns entry with stable key", () => {
    const list = new ListState<string>([]);
    const entry = list.insert("x");

    expect(list.states()).toHaveLength(1);
    expect(entry.state.get()).toBe("x");
    expect(typeof entry.key).toBe("number");
  });

  it("notifies listeners on insert", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.onChange(listener);
    list.insert(2);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when silent=true", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.onChange(listener);
    list.insert(2, true);

    expect(listener).not.toHaveBeenCalled();
    expect(list.states()).toHaveLength(2);
  });
});

describe("ListState remove", () => {
  it("removes the entry associated with the given state", () => {
    const list = new ListState([1, 2, 3]);
    const [first] = list.states();

    list.remove(first);

    expect(list.states()).toHaveLength(2);
    expect(list.states()[0].get()).toBe(2);
  });

  it("notifies listeners on remove", () => {
    const list = new ListState([1, 2]);
    const [first] = list.states();
    const listener = vi.fn();

    list.onChange(listener);
    list.remove(first);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing when state is not found", () => {
    const list = new ListState([1]);
    const orphan = new State(99);
    const listener = vi.fn();

    list.onChange(listener);
    list.remove(orphan);

    expect(listener).not.toHaveBeenCalled();
    expect(list.states()).toHaveLength(1);
  });

  it("does not notify when silent=true", () => {
    const list = new ListState([1, 2]);
    const [first] = list.states();
    const listener = vi.fn();

    list.onChange(listener);
    list.remove(first, true);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("ListState move", () => {
  it("moves entry from one index to another", () => {
    const list = new ListState([1, 2, 3]);
    list.move(0, 2);

    const values = list.states().map((s) => s.get());
    expect(values).toEqual([2, 3, 1]);
  });

  it("notifies listeners on move", () => {
    const list = new ListState([1, 2, 3]);
    const listener = vi.fn();

    list.onChange(listener);
    list.move(0, 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing for out-of-bounds or equal indices", () => {
    const list = new ListState([1, 2, 3]);
    const listener = vi.fn();

    list.onChange(listener);
    list.move(0, 0);
    list.move(-1, 1);
    list.move(0, 10);

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not notify when silent=true", () => {
    const list = new ListState([1, 2, 3]);
    const listener = vi.fn();

    list.onChange(listener);
    list.move(0, 2, true);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("ListState swap", () => {
  it("swaps two entries by index", () => {
    const list = new ListState([1, 2, 3]);
    list.swap(0, 2);

    const values = list.states().map((s) => s.get());
    expect(values).toEqual([3, 2, 1]);
  });

  it("notifies listeners on swap", () => {
    const list = new ListState([1, 2]);
    const listener = vi.fn();

    list.onChange(listener);
    list.swap(0, 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing for out-of-bounds or equal indices", () => {
    const list = new ListState([1, 2]);
    const listener = vi.fn();

    list.onChange(listener);
    list.swap(0, 0);
    list.swap(-1, 1);
    list.swap(0, 10);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("ListState clear", () => {
  it("removes all entries", () => {
    const list = new ListState([1, 2, 3]);
    list.clear();

    expect(list.states()).toHaveLength(0);
  });

  it("notifies listeners on clear", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    list.onChange(listener);
    list.clear();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when already empty", () => {
    const list = new ListState<number>([]);
    const listener = vi.fn();

    list.onChange(listener);
    list.clear();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("ListState reset", () => {
  it("restores original insertion order after move", () => {
    const list = new ListState([1, 2, 3]);
    const originalKeys = list.keys().slice();

    list.move(0, 2);
    list.reset();

    expect(list.keys()).toEqual(originalKeys);
  });

  it("notifies listeners on reset", () => {
    const list = new ListState([1, 2, 3]);
    const listener = vi.fn();

    list.move(0, 2);
    list.onChange(listener);
    list.reset();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ListState onChange", () => {
  it("returns a release function that unsubscribes the listener", () => {
    const list = new ListState([1]);
    const listener = vi.fn();

    const release = list.onChange(listener);
    list.insert(2);
    release();
    list.insert(3);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("ListState key stability", () => {
  it("keys are stable across reorders", () => {
    const list = new ListState([1, 2, 3]);
    const keysBefore = list.keys().slice();

    list.move(0, 2);

    const keysAfter = list.keys();
    expect(new Set(keysAfter)).toEqual(new Set(keysBefore));
  });

  it("each insert gets a unique key never seen before", () => {
    const list = new ListState([1, 2]);
    const [first] = list.states();
    const removedKey = list.entries()[0].key;

    list.remove(first);
    const newEntry = list.insert(99);

    expect(newEntry.key).not.toBe(removedKey);
  });
});

describe("ListState _dispose", () => {
  it("clears entries and stops notifying", () => {
    const list = new ListState([1, 2]);
    const listener = vi.fn();

    list.onChange(listener);
    list._dispose();
    list.insert(3);

    expect(listener).not.toHaveBeenCalled();
    expect(list.states()).toHaveLength(0);
  });
});
