// @vitest-environment jsdom
//
// Regression coverage for the per-node behavior contract (see `behavior()`
// in utils.ts and ElementNode's `_processBehaviors`/`getBehavior`). Fixes the
// bug class AGENTS.md's "Reused-node lifecycle" section describes: a patch
// factory called again by a reactive parent gets a FRESH closure on the SAME
// reused DOM node, but `_onMount` only ever fires for the FIRST-ever
// generation — so an imperative, document-level listener wired there (an
// outside-click/Escape dismiss handler) keeps acting on that first
// generation's closure-local state forever, even though live-rebound trigger
// events (onClick) move on to whatever generation is actually current. The
// BEFORE test below reproduces the bug with the naive pattern the contract
// replaces; the AFTER test proves `behavior()` fixes it.
import { afterEach, describe, expect, it } from "vitest";
import type { State } from "../src/classes/State.ts";
import { ElementNode } from "../src/classes/ElementNode.ts";
import type { DomphyElement, PartialElement } from "../src/types.ts";
import { behavior, toState } from "../src/utils.ts";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

function mountApp(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

// A reactive parent (`refresh`) wrapping a SAME-keyed child button — every
// `rerender()` calls `makeTrigger()` again, producing a fresh factory closure
// patched onto the SAME reused DOM button (the exact shape of the historical
// bugs — see floating-lifecycle-matrix.test.ts in packages/ui for the
// equivalent at the patch-authoring level).
function mountReactiveTrigger(makeTrigger: () => PartialElement) {
  const refresh = toState(0);
  const { host } = mountApp({
    div: [
      {
        div: (listener: any) => {
          refresh.get(listener);
          return [{ button: "Trigger", $: [makeTrigger()], _key: "anchor" }];
        },
      },
    ],
  } as DomphyElement);
  const rerender = async () => {
    refresh.set(refresh.get() + 1);
    await flush();
  };
  return { host, rerender };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("behavior(): per-node contract vs. the reused-node/stale-closure bug class", () => {
  it("BEFORE: a hand-rolled closure-local listener orphans on re-render (reproduces the bug)", async () => {
    // Test hook: always points at the LATEST generation's own openState —
    // stands in for "what a live-rebound event handler would read/write".
    let currentOpenState = toState(false);
    let keydownHandler: ((event: Event) => void) | null = null;

    function naiveTrigger(): PartialElement {
      const openState = toState(false);
      currentOpenState = openState;
      return {
        onClick: () => openState.set(true), // live-rebound every patch — always current
        _onMount: () => {
          // _onMount fires ONCE per real DOM node — only the FIRST-ever
          // generation's closure (and its OWN openState) ever gets wired here.
          keydownHandler = (event: Event) => {
            if ((event as KeyboardEvent).key === "Escape" && openState.get()) {
              openState.set(false);
            }
          };
          document.addEventListener("keydown", keydownHandler);
        },
      };
    }

    try {
      const { host, rerender } = mountReactiveTrigger(naiveTrigger);
      await rerender(); // generation 2 is now live; currentOpenState -> generation 2's own state

      host.querySelector("button")!.click(); // opens generation 2's state
      expect(currentOpenState.get()).toBe(true);

      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      // BUG: the Escape listener is still bound to generation 1's (never
      // opened) openState — generation 2's actually-open state is untouched.
      expect(currentOpenState.get()).toBe(true);
    } finally {
      if (keydownHandler) document.removeEventListener("keydown", keydownHandler);
    }
  });

  it("AFTER: behavior() routes fresh props into the SAME instance across N re-renders — dismiss still works", async () => {
    let currentOpenState = toState(false);

    function wiredTrigger(): PartialElement {
      const openState = toState(false);
      currentOpenState = openState;
      return {
        onClick: () => openState.set(true), // live-rebound every patch — always current
        ...behavior<{ openState: State<boolean> }>(
          "dismissible",
          (_node, props) => {
            // Runs ONCE for the real DOM node no matter how many times this
            // factory is called on later re-renders.
            let liveOpenState = props.openState;
            const onKeydown = (event: Event) => {
              if (
                (event as KeyboardEvent).key === "Escape" &&
                liveOpenState.get()
              ) {
                liveOpenState.set(false);
              }
            };
            document.addEventListener("keydown", onKeydown);
            return {
              // Every later generation's fresh openState is routed HERE,
              // into the SAME instance — not lost with the discarded closure.
              update: (nextProps) => {
                liveOpenState = nextProps.openState;
              },
              destroy: () => document.removeEventListener("keydown", onKeydown),
            };
          },
          { openState },
        ),
      };
    }

    const { host, rerender } = mountReactiveTrigger(wiredTrigger);
    await rerender();
    await rerender();
    await rerender(); // N re-renders — a fresh factory closure + fresh openState each time

    host.querySelector("button")!.click(); // opens the LATEST generation's state
    expect(currentOpenState.get()).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    // FIXED: the instance's update() kept `liveOpenState` pointed at whatever
    // generation is current, so Escape correctly closes it.
    expect(currentOpenState.get()).toBe(false);
  });

  it("destroy() runs exactly once when the node is removed, even after several re-renders", async () => {
    let destroyCount = 0;
    let updateCount = 0;

    function wiredTrigger(): PartialElement {
      return behavior<{ tag: number }>(
        "counted",
        () => ({
          update: () => {
            updateCount++;
          },
          destroy: () => {
            destroyCount++;
          },
        }),
        { tag: Math.random() },
      );
    }

    const items = toState([1]);
    const { host } = mountApp({
      div: (listener: any) =>
        items
          .get(listener)
          .map((id: number) => ({ button: "x", $: [wiredTrigger()], _key: id })),
    } as DomphyElement);

    expect(host.querySelectorAll("button").length).toBe(1);
    expect(destroyCount).toBe(0);

    // Re-render the SAME keyed item 3 times — attach() must not re-run.
    items.set([1]);
    await flush();
    items.set([1]);
    await flush();
    items.set([1]);
    await flush();
    expect(updateCount).toBe(3);
    expect(destroyCount).toBe(0);

    items.set([]); // remove the node
    await flush();
    expect(destroyCount).toBe(1);
  });
});
