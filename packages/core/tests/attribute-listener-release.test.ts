// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ElementNode, flushSync } from "../src/index.js";

// `Notifier.addListener` invokes exactly ONE `onSubscribe` per handler, and it
// is the only channel through which a subscriber receives its release handle.
// `ElementAttribute.addListener` used to REPLACE the caller's `onSubscribe`
// with its own, so a caller that supplied one never got a handle and could
// never unsubscribe — its subscription stayed alive for as long as the node
// did, which for a cached or long-lived node is forever.
//
// The truth these tests use is observable behaviour, not internals: a released
// listener must stop being notified, and a listener that was never released
// must keep being notified. Retention follows from that — a notifier cannot
// hold a listener it no longer has.

function attributeOf(node: ElementNode, name: string) {
  const attribute = node.attributes?.items?.[name];
  if (!attribute) throw new Error(`no attribute ${name}`);
  return attribute;
}

describe("ElementAttribute.addListener release handles", () => {
  it("hands the caller's own onSubscribe the release handle", () => {
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    const attribute = attributeOf(node, "dataTone");

    const handles: Array<() => void> = [];
    const handler = (() => {}) as {
      (value: unknown): void;
      onSubscribe?: unknown;
    };
    handler.onSubscribe = (release: () => void) => handles.push(release);

    attribute.addListener(handler);

    // Previously zero: the attribute's own onSubscribe had replaced this one.
    expect(handles).toHaveLength(1);
    expect(typeof handles[0]).toBe("function");
  });

  it("actually unsubscribes when the caller releases", () => {
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    const attribute = attributeOf(node, "dataTone");

    const seen: unknown[] = [];
    let release: (() => void) | null = null;
    const handler = ((value: unknown) => seen.push(value)) as {
      (value: unknown): void;
      onSubscribe?: unknown;
    };
    handler.onSubscribe = (handle: () => void) => {
      release = handle;
    };

    attribute.addListener(handler);
    attribute.set("shift-1");
    flushSync();
    expect(seen).toEqual(["shift-1"]);

    release!();
    attribute.set("shift-2");
    flushSync();
    // Still one: the release really removed the listener from the notifier.
    expect(seen).toEqual(["shift-1"]);
  });

  it("keeps notifying a listener that was never released", () => {
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    const attribute = attributeOf(node, "dataTone");
    const seen: unknown[] = [];
    attribute.addListener((value: unknown) => seen.push(value));
    attribute.set("shift-1");
    flushSync();
    attribute.set("shift-2");
    flushSync();
    expect(seen).toEqual(["shift-1", "shift-2"]);
  });

  it("still drains its own subscriptions when the node is removed", () => {
    // The attribute's bookkeeping must survive composing onto the caller's.
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    node.render(host);
    const attribute = attributeOf(node, "dataTone");

    const seen: unknown[] = [];
    const handler = ((value: unknown) => seen.push(value)) as {
      (value: unknown): void;
      onSubscribe?: unknown;
    };
    handler.onSubscribe = () => {};

    attribute.addListener(handler);
    attribute.set("shift-1");
    flushSync();
    expect(seen).toHaveLength(1);

    node.remove();
    attribute.set("shift-2");
    flushSync();
    expect(seen).toHaveLength(1);
  });

  it("does not re-wrap the same handler on the same attribute", () => {
    // `Notifier` ignores a duplicate registration, so a re-wrap would build a
    // closure chain it never calls — growth with no upper bound.
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    const attribute = attributeOf(node, "dataTone");
    const handler = (() => {}) as {
      (value: unknown): void;
      onSubscribe?: unknown;
    };
    handler.onSubscribe = () => {};

    attribute.addListener(handler);
    const wrapped = handler.onSubscribe;
    attribute.addListener(handler);
    attribute.addListener(handler);
    expect(handler.onSubscribe).toBe(wrapped);
  });

  it("lets one handler collect a release from each attribute it joins", () => {
    const node = new ElementNode({
      div: "x",
      dataTone: "shift-0",
      dataDensity: "increase-1",
    } as never);
    const handles: Array<() => void> = [];
    const handler = (() => {}) as {
      (value: unknown): void;
      onSubscribe?: unknown;
    };
    handler.onSubscribe = (release: () => void) => handles.push(release);

    attributeOf(node, "dataTone").addListener(handler);
    attributeOf(node, "dataDensity").addListener(handler);

    expect(handles).toHaveLength(2);
    expect(handles[0]).not.toBe(handles[1]);
  });
});

// The retained-closure count IS the leak: `Notifier` dropping the handler is
// only half a release, because the attribute's own array still held a closure
// that captured it. Verified against real retention with `node --expose-gc`:
// 200 and 500 subscribe/release cycles on one long-lived node both left a
// constant 2 handlers alive (the loop's final locals) and 0 closures held by
// the attribute, while the same run without releasing retained all 500.
describe("released handles stop being retained", () => {
  it("holds no release closure once every subscriber has released", () => {
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    const attribute = attributeOf(node, "dataTone") as unknown as {
      _listenerReleases: unknown[];
      addListener(callback: unknown): void;
    };

    const releases: Array<() => void> = [];
    for (let index = 0; index < 20; index++) {
      const handler = (() => {}) as {
        (value: unknown): void;
        onSubscribe?: unknown;
      };
      handler.onSubscribe = (release: () => void) => releases.push(release);
      attribute.addListener(handler);
    }
    expect(releases).toHaveLength(20);
    expect(attribute._listenerReleases).toHaveLength(20);

    for (const release of releases) release();
    expect(attribute._listenerReleases).toHaveLength(0);
  });

  it("drains correctly even though the handles prune themselves", () => {
    // Draining the live array in place would splice under the iteration and
    // skip every other entry, so removal must snapshot first.
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({ div: "x", dataTone: "shift-0" } as never);
    node.render(host);
    const attribute = attributeOf(node, "dataTone") as unknown as {
      _listenerReleases: unknown[];
      addListener(callback: unknown): void;
      set(value: unknown): void;
    };

    const seen: unknown[] = [];
    for (let index = 0; index < 6; index++) {
      attribute.addListener((value: unknown) => seen.push(value));
    }
    attribute.set("shift-1");
    flushSync();
    expect(seen).toHaveLength(6);

    node.remove();
    attribute.set("shift-2");
    flushSync();
    // Every one of the six is gone — not three of them.
    expect(seen).toHaveLength(6);
    expect(attribute._listenerReleases).toHaveLength(0);
  });
});
