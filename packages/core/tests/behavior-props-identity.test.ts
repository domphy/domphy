// @vitest-environment jsdom
//
// Truth source: the documented `behavior(key, attach, props)` contract —
// "`attach(node, props)` runs ONCE for the real DOM node … every later
// re-render's `props` are routed into that SAME instance via `update(props)`"
// (AGENTS.md, "Reused-node lifecycle"; docs/core/patterns#per-node-behavior).
// Routing an object into an existing instance is only meaningful if it is THE
// object the caller passed: the contract is about identity, so a behavior's
// props must arrive by reference. A shared registry, a Map/Set, a third-party
// handle or a callback-bearing object are all normal things to pass, and a
// deep copy silently breaks every one of them while leaving functions and
// class instances working — a selective failure with no error anywhere.
import { describe, expect, it } from "vitest";
import { behavior, ElementNode } from "../src/index.ts";

function mount(element: unknown): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(element as any).render(host);
  return host;
}

describe("behavior() props reach attach() by reference", () => {
  it("siblings sharing one registry array all receive that same array", () => {
    const registry: string[] = [];
    const seen: string[][] = [];
    const icon = (name: string) => ({
      span: name,
      _key: name,
      $: [
        behavior(
          "probe",
          (_node, props: { registry: string[] }) => {
            seen.push(props.registry);
            props.registry.push(name);
            return {};
          },
          { registry },
        ),
      ],
    });

    mount({ div: ["a", "b", "c"].map(icon) });

    // One array, not three copies — and the pushes landed in the caller's.
    expect(new Set(seen).size).toBe(1);
    expect(seen[0]).toBe(registry);
    expect(registry).toEqual(["a", "b", "c"]);
  });

  it("a parent and its children share one registry object", () => {
    const registry = { items: [] as string[] };
    const collect = (name: string) =>
      behavior(
        "collect",
        (_node, props: { registry: typeof registry }) => {
          props.registry.items.push(name);
          return {};
        },
        { registry },
      );

    mount({
      nav: [{ span: "icon", _key: "icon", $: [collect("icon")] }],
      $: [collect("nav")],
    });

    expect(registry.items.sort()).toEqual(["icon", "nav"]);
  });

  it("a Map passed through props is the caller's Map", () => {
    const store = new Map<string, number>();
    mount({
      div: "x",
      $: [
        behavior(
          "map",
          (_node, props: { store: Map<string, number> }) => {
            props.store.set("mounted", 1);
            return {};
          },
          { store },
        ),
      ],
    });
    expect(store.get("mounted")).toBe(1);
  });

  it("update() receives the new generation's props object by reference", () => {
    const first = { tag: "first" };
    const second = { tag: "second" };
    const updates: object[] = [];

    const host = document.createElement("div");
    document.body.appendChild(host);
    const make = (props: object) => ({
      div: "x",
      $: [
        behavior(
          "route",
          () => ({
            update: (next: object) => updates.push(next),
          }),
          props,
        ),
      ],
    });
    const node = new ElementNode(make(first) as any);
    node.render(host);
    node.patch(make(second) as any);

    expect(updates).toEqual([second]);
    expect(updates[0]).toBe(second);
  });
});
