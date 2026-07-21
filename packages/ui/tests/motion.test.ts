// @vitest-environment jsdom
// motion respects prefers-reduced-motion (Front-End Checklist / WCAG 2.3.3)

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { motion } from "../src/index.ts";

// jsdom lacks the Web Animations API; record calls + expose a controllable
// `finished` promise so the patch wiring can be asserted.
interface FakeAnim {
  finished: Promise<void>;
  keyframes: Keyframe[];
  resolve: () => void;
}
const calls: FakeAnim[] = [];

function installWaapi() {
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = (
    keyframes: Keyframe[],
  ) => {
    let resolve!: () => void;
    const finished = new Promise<void>((r) => {
      resolve = r;
    });
    const anim: FakeAnim = { finished, keyframes, resolve };
    calls.push(anim);
    return anim as unknown as Animation;
  };
}

function mount(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { node, host };
}

afterEach(() => {
  calls.length = 0;
});

describe("motion patch", () => {
  it("runs an enter animation from initial to animate on mount", () => {
    installWaapi();
    mount({
      div: "hi",
      $: [
        motion({
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
        }),
      ],
    } as DomphyElement);

    expect(calls.length).toBe(1);
    const [from, to] = calls[0].keyframes as Array<Record<string, unknown>>;
    expect(from.opacity).toBe(0);
    expect(from.transform).toBe("translateY(20px)");
    expect(to.opacity).toBe(1);
    expect(to.transform).toBe("translateY(0px)");
  });

  it("re-animates when a reactive animate State changes", async () => {
    installWaapi();
    const pos = toState<{ x: number }>({ x: 0 });
    mount({ div: "box", $: [motion({ animate: pos })] } as DomphyElement);
    expect(calls.length).toBe(1); // initial

    pos.set({ x: 100 });
    await new Promise((r) => setTimeout(r, 0)); // flush microtask notify
    expect(calls.length).toBe(2);
    const frame = calls[1].keyframes[0] as Record<string, unknown>;
    expect(frame.transform).toBe("translateX(100px)");
  });

  it("plays the exit animation and calls done before removal", async () => {
    installWaapi();
    const { node } = mount({
      div: "bye",
      $: [motion({ animate: { opacity: 1 }, exit: { opacity: 0 } })],
    } as DomphyElement);
    calls.length = 0; // ignore the enter animation

    node.remove();
    expect(calls.length).toBe(1); // exit animation started
    expect((calls[0].keyframes[0] as Record<string, unknown>).opacity).toBe(0);

    calls[0].resolve(); // finish the exit animation -> done() removes the node
    await calls[0].finished;
  });

  it("is a no-op (no throw) when the Web Animations API is absent", () => {
    (HTMLElement.prototype as unknown as { animate?: unknown }).animate =
      undefined;
    expect(() =>
      mount({
        div: "x",
        $: [motion({ animate: { opacity: 1 } })],
      } as DomphyElement),
    ).not.toThrow();
  });

  it("skips WAAPI and applies final styles when prefers-reduced-motion", () => {
    installWaapi();
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia;

    const { host } = mount({
      div: "calm",
      $: [
        motion({
          initial: { opacity: 0 },
          animate: { opacity: 1 },
        }),
      ],
    } as DomphyElement);

    expect(calls.length).toBe(0);
    expect((host.firstElementChild as HTMLElement).style.opacity).toBe("1");
    window.matchMedia = original;
  });
});
