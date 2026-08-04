// @vitest-environment jsdom
// Model-based property tests for keyed list reconciliation and state
// interleaving (fast-check). The model is a plain array of { key, value }
// entries — the source of truth. Every generated command applies the same
// mutation to the model and (via items.set + flushSync) to a real Domphy
// keyed list mounted in jsdom, then asserts the invariants of the
// reused-node lifecycle contract:
//
//   a. DOM children order and text match the model exactly.
//   b. Keyed node identity: a key that survives a step keeps the SAME DOM
//      element instance (reuse contract); a key that was removed and later
//      re-added gets a FRESH element (no resurrection of disposed nodes).
//   c. No duplicate keys in the DOM and no leftover nodes beyond the model
//      length (DOM child count === model length, logical items match too).
//
// A failing property prints the fast-check seed + shrunk counterexample —
// keep that output intact for debugging (do not hard-code the seed away).

import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import type { DomphyElement } from "../src/index.ts";
import { ElementNode, flushSync, toState } from "../src/index.ts";

// Small key pool so removals + re-inserts actually reuse/collide keys.
const KEY_POOL = Array.from({ length: 16 }, (_, i) => `K${i}`);
const MAX_LENGTH = 12;

type ModelItem = { key: string; value: number };
type Model = ModelItem[];

type ListOp =
  | { type: "insert"; keyIndex: number; pos: number; value: number }
  | { type: "remove"; pos: number }
  | { type: "move"; from: number; to: number }
  | { type: "update"; pos: number; value: number };

const listOpArb: fc.Arbitrary<ListOp> = fc.oneof(
  // Weighted towards insert/remove so length changes (the risky path) dominate.
  {
    weight: 3,
    arbitrary: fc.record({
      type: fc.constant("insert" as const),
      keyIndex: fc.nat(KEY_POOL.length - 1),
      pos: fc.nat(MAX_LENGTH),
      value: fc.nat(999),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      type: fc.constant("remove" as const),
      pos: fc.nat(MAX_LENGTH),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      type: fc.constant("move" as const),
      from: fc.nat(MAX_LENGTH),
      to: fc.nat(MAX_LENGTH),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      type: fc.constant("update" as const),
      pos: fc.nat(MAX_LENGTH),
      value: fc.nat(999),
    }),
  },
);

type TickOp = { type: "tick"; value: number };
const tickOpArb: fc.Arbitrary<TickOp> = fc.record({
  type: fc.constant("tick" as const),
  value: fc.nat(999),
});

// Apply a command to the model, clamping indices and degrading invalid
// operations to no-ops (keeps every generated sequence executable, which is
// what lets fast-check shrink failures freely).
function applyToModel(model: Model, op: ListOp): void {
  switch (op.type) {
    case "insert": {
      if (model.length >= MAX_LENGTH) return;
      let key = KEY_POOL[op.keyIndex % KEY_POOL.length];
      if (model.some((item) => item.key === key)) {
        const free = KEY_POOL.find(
          (k) => !model.some((item) => item.key === k),
        );
        if (free === undefined) return;
        key = free;
      }
      const pos = Math.min(op.pos, model.length);
      model.splice(pos, 0, { key, value: op.value });
      return;
    }
    case "remove": {
      if (model.length === 0) return;
      model.splice(op.pos % model.length, 1);
      return;
    }
    case "move": {
      if (model.length < 2) return;
      const from = op.from % model.length;
      const to = op.to % model.length;
      if (from === to) return;
      const [item] = model.splice(from, 1);
      model.splice(to, 0, item);
      return;
    }
    case "update": {
      if (model.length === 0) return;
      model[op.pos % model.length].value = op.value;
      return;
    }
  }
}

function mountApp(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

// Read the rendered list items in DOM order as [data-key, element] pairs.
function domItems(host: HTMLElement): Array<[string, HTMLElement]> {
  return Array.from(host.querySelector("ul")!.children).map((el) => [
    (el as HTMLElement).dataset.key ?? "",
    el as HTMLElement,
  ]);
}

// Assert invariants (a) and (c): order + text match the model, no duplicate
// keys, no leftover nodes, logical items in sync with the DOM.
function assertListMatchesModel(
  host: HTMLElement,
  node: ElementNode,
  model: Model,
  expectedText: (item: ModelItem) => string,
): Array<[string, HTMLElement]> {
  const dom = domItems(host);

  // (a) order and length
  expect(dom.length).toBe(model.length);
  expect(dom.map(([key]) => key)).toEqual(model.map((item) => item.key));
  for (let i = 0; i < model.length; i++) {
    expect(dom[i][1].textContent).toBe(expectedText(model[i]));
  }

  // (c) no duplicate keys
  expect(new Set(dom.map(([key]) => key)).size).toBe(dom.length);

  // (c) logical list in sync with the DOM (no imperative nodes in these tests)
  const logicalKeys = node.children.items.map((item) =>
    item instanceof ElementNode ? item.key : null,
  );
  expect(logicalKeys).toEqual(model.map((item) => item.key));

  return dom;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("property: keyed list reconciliation matches a naive array model", () => {
  it("random insert/remove/move/update sequences preserve order, identity and length", () => {
    fc.assert(
      fc.property(
        fc.array(listOpArb, { minLength: 1, maxLength: 60 }),
        (ops) => {
          const model: Model = [];
          const items = toState<Model>([], "pbtItems");
          const { host, node } = mountApp({
            ul: (l: any) =>
              items.get(l).map((it: ModelItem) => ({
                li: `${it.key}#${it.value}`,
                _key: it.key,
                "data-key": it.key,
              })),
          } as DomphyElement);

          // Keyed identity tracking across steps. `present` is the key set of
          // the previous step; `lastSeen[key]` is the element that rendered
          // that key most recently.
          let present = new Set<string>();
          const lastSeen = new Map<string, HTMLElement>();

          for (const op of ops) {
            applyToModel(model, op);
            items.set(model.map((item) => ({ ...item })));
            flushSync();

            const dom = assertListMatchesModel(
              host,
              node,
              model,
              (item) => `${item.key}#${item.value}`,
            );

            // (b) identity contract
            for (const [key, el] of dom) {
              const seen = lastSeen.get(key);
              if (present.has(key)) {
                // Key survived the step → SAME DOM element (reuse contract).
                expect(el).toBe(seen);
              } else if (seen !== undefined) {
                // Key was removed earlier and re-added → FRESH element.
                expect(el).not.toBe(seen);
              }
              lastSeen.set(key, el);
            }
            present = new Set(dom.map(([key]) => key));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("property: interleaved state.set + list ops render the latest state", () => {
  it("text always reflects the latest tick and the latest model after a flush", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            { weight: 1, arbitrary: tickOpArb },
            { weight: 4, arbitrary: listOpArb },
          ),
          {
            minLength: 1,
            maxLength: 60,
          },
        ),
        (ops) => {
          const model: Model = [];
          const items = toState<Model>([], "pbtInterleaveItems");
          const tick = toState(0, "pbtInterleaveTick");
          const { host, node } = mountApp({
            ul: (l: any) =>
              items.get(l).map((it: ModelItem) => ({
                li: (l2: any) => `${it.key}#${it.value}@${tick.get(l2)}`,
                _key: it.key,
                "data-key": it.key,
              })),
          } as DomphyElement);

          let latestTick = 0;
          let present = new Set<string>();
          const lastSeen = new Map<string, HTMLElement>();

          for (const op of ops) {
            if (op.type === "tick") {
              latestTick = op.value;
              tick.set(op.value);
            } else {
              applyToModel(model, op);
              items.set(model.map((item) => ({ ...item })));
            }
            flushSync();

            const dom = assertListMatchesModel(
              host,
              node,
              model,
              (item) => `${item.key}#${item.value}@${latestTick}`,
            );

            // (b) identity contract also holds under state interleaving.
            for (const [key, el] of dom) {
              const seen = lastSeen.get(key);
              if (present.has(key)) {
                expect(el).toBe(seen);
              } else if (seen !== undefined) {
                expect(el).not.toBe(seen);
              }
              lastSeen.set(key, el);
            }
            present = new Set(dom.map(([key]) => key));
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
