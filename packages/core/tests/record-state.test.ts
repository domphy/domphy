import { describe, expect, it, vi } from "vitest";
import { RecordState } from "../src/classes/RecordState.ts";

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

describe("RecordState.reset", () => {
  it("restores a key to its initial value and notifies listeners", async () => {
    const record = new RecordState({ count: 1, name: "init" });
    const seen: number[] = [];
    record.addListener("count", (value) => seen.push(value));

    record.set("count", 5);
    await flush();
    expect(record.get("count")).toBe(5);
    expect(seen).toEqual([5]);

    record.reset("count");
    await flush();
    expect(record.get("count")).toBe(1); // back to initial
    expect(seen).toEqual([5, 1]); // reset goes through set → notifies
  });

  it("resets only the targeted key, leaving others untouched", async () => {
    const record = new RecordState({ a: 1, b: 2 });
    record.set("a", 10);
    record.set("b", 20);

    record.reset("a");
    await flush();

    expect(record.get("a")).toBe(1);
    expect(record.get("b")).toBe(20);
  });
});

describe("RecordState.removeListener", () => {
  it("stops a removed listener from being called on later changes", async () => {
    const record = new RecordState({ value: 0 });
    const listener = vi.fn();
    record.addListener("value", listener);

    record.set("value", 1);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);

    record.removeListener("value", listener);
    record.set("value", 2);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1); // not called again
  });

  it("addListener returns a release function that detaches the listener", async () => {
    const record = new RecordState({ value: 0 });
    const listener = vi.fn();
    const release = record.addListener("value", listener);

    record.set("value", 1);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);

    release();
    record.set("value", 2);
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("removing a never-added listener is a safe no-op", () => {
    const record = new RecordState({ value: 0 });
    expect(() => record.removeListener("value", () => {})).not.toThrow();
  });
});
