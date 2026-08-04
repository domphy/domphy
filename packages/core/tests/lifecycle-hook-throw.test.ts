// @vitest-environment jsdom
//
// Regression coverage for lifecycle-hook exception safety: a throwing
// _onBeforeRemove must NOT wedge the node. Before the fix, the hook threw
// after _beforeRemoveFired was set, so every later removal attempt
// early-returned — the node stayed in the list and in the DOM forever,
// leaking its subscriptions. The removal now completes and the error is
// routed to the nearest error boundary (console.error without one).
import { describe, expect, it, vi } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { flushSync } from "../src/classes/Reactive.ts";
import { State } from "../src/classes/State.ts";

describe("throwing _onBeforeRemove", () => {
  it("completes the removal and the list keeps reconciling", async () => {
    const s = new State(1);
    const root = new ElementNode({
      div: (l: any) =>
        s.get(l) === 1
          ? [
              {
                span: "x",
                _onBeforeRemove: () => {
                  throw new Error("boom");
                },
              },
            ]
          : [],
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const host = document.createElement("div");
      document.body.appendChild(host);
      root.render(host);
      expect(host.querySelectorAll("span").length).toBe(1);

      s.set(2); // reactive children update -> removes the span
      flushSync();
      await new Promise((r) => setTimeout(r, 20));

      // Removal completed despite the throw: gone from DOM and from items.
      expect(host.querySelectorAll("span").length).toBe(0);
      expect(root.children.items.length).toBe(0);
      // The error was routed, not swallowed silently.
      expect(consoleError).toHaveBeenCalled();

      // The list still reconciles afterwards (no wedged _beforeRemoveFired node).
      s.set(1);
      flushSync();
      await new Promise((r) => setTimeout(r, 20));
      expect(host.querySelectorAll("span").length).toBe(1);
      expect(root.children.items.length).toBe(1);

      root.remove();
      host.remove();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("routes the error to an ancestor error boundary", async () => {
    const s = new State(1);
    const caught: unknown[] = [];
    const root = new ElementNode({
      div: [
        {
          section: (l: any) =>
            s.get(l) === 1
              ? [
                  {
                    span: "x",
                    _onBeforeRemove: () => {
                      throw new Error("boom");
                    },
                  },
                ]
              : [],
        },
      ],
      _onError: (_node: any, error: unknown) => {
        caught.push(error);
      },
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    root.render(host);

    s.set(2);
    flushSync();
    await new Promise((r) => setTimeout(r, 20));

    expect(caught.length).toBe(1);
    expect((caught[0] as Error).message).toBe("boom");
    expect(host.querySelectorAll("span").length).toBe(0);

    root.remove();
    host.remove();
  });

  it("root-level remove() with a throwing BeforeRemove still disposes", () => {
    const root = new ElementNode({
      div: "x",
      _onBeforeRemove: () => {
        throw new Error("boom");
      },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const host = document.createElement("div");
      document.body.appendChild(host);
      root.render(host);
      expect(host.querySelector("div")).not.toBeNull();

      root.remove();
      expect(root._disposed).toBe(true);
      expect(host.querySelector("div")).toBeNull();
      expect(consoleError).toHaveBeenCalled();

      host.remove();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("a hook that completes and THEN throws does not double-dispose", async () => {
    const s = new State(1);
    let disposeCount = 0;
    const root = new ElementNode({
      div: (l: any) =>
        s.get(l) === 1
          ? [
              {
                span: "x",
                _onBeforeRemove: (_node: any, done: () => void) => {
                  done();
                  throw new Error("late boom");
                },
                _onRemove: () => {
                  disposeCount++;
                },
              },
            ]
          : [],
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      const host = document.createElement("div");
      document.body.appendChild(host);
      root.render(host);

      s.set(2);
      flushSync();
      await new Promise((r) => setTimeout(r, 20));

      expect(disposeCount).toBe(1); // done() ran exactly once
      expect(host.querySelectorAll("span").length).toBe(0);

      root.remove();
      host.remove();
    } finally {
      consoleError.mockRestore();
    }
  });
});
