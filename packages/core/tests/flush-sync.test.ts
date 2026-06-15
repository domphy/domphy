// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode } from "../src/classes/ElementNode.ts";
import { computed, effect, flushSync } from "../src/classes/Reactive.ts";
import type { DomphyElement } from "../src/types.ts";
import { toState } from "../src/utils.ts";

function mountApp(App: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("flushSync", () => {
  it("applies a state change to the DOM synchronously (no await)", () => {
    const count = toState(0, "fs-count");
    const { host } = mountApp({
      p: (l: any) => `n=${count.get(l)}`,
    } as DomphyElement);

    expect(host.querySelector("p")!.textContent).toBe("n=0");
    count.set(5);
    flushSync();
    expect(host.querySelector("p")!.textContent).toBe("n=5");
  });

  it("settles a computed -> effect chain synchronously", () => {
    const a = toState(1, "fs-a");
    const double = computed(() => a.get() * 2);
    let seen = 0;
    effect(() => {
      seen = double.get();
    });

    expect(seen).toBe(2);
    a.set(5);
    flushSync();
    expect(seen).toBe(10);
  });

  it("is a no-op when nothing is pending", () => {
    expect(() => flushSync()).not.toThrow();
  });
});

describe("reactive text patches the existing DOM text node in place", () => {
  it("reuses the same Text node across updates (mutates nodeValue)", () => {
    const count = toState(0, "tn-count");
    const { host } = mountApp({
      p: (l: any) => `count: ${count.get(l)}`,
    } as DomphyElement);

    const paragraph = host.querySelector("p")!;
    const textNode = paragraph.firstChild;
    expect(textNode?.nodeType).toBe(3); // Node.TEXT_NODE
    expect(paragraph.textContent).toBe("count: 0");

    count.set(42);
    flushSync();

    // Same DOM text node — patched in place, not recreated.
    expect(paragraph.firstChild).toBe(textNode);
    expect(textNode?.nodeValue).toBe("count: 42");
  });
});
