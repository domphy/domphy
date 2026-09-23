// @vitest-environment jsdom
import fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import { ElementNode, flushSync, toState } from "../src/index.js";

// A node whose declarations change leaves the shared content-hashed scope
// class for a private one (`_detachStyleScope`). These are the two contracts
// that path has to keep, each with a truth source outside this code:
//
//  1. CSSOM value normalization (CSSOM §6, "serialize a CSS value"): a value
//     written to a rule is read back in its canonical form, so a declared
//     string is NEVER comparable to a readback. Detach must be decided on the
//     normalized value or every reactive declaration the parser rewrites
//     detaches on its first activation.
//  2. Domphy's own reactivity contract: a reactive attribute re-resolves on
//     every listener tick for the node's whole life. Removing a class must not
//     end that.

function liveRules(): { selector: string; text: string }[] {
  const out: { selector: string; text: string }[] = [];
  for (const style of Array.from(document.head.querySelectorAll("style"))) {
    const sheet = (style as HTMLStyleElement).sheet;
    if (!sheet) continue;
    for (const rule of Array.from(sheet.cssRules)) {
      out.push({
        selector: (rule as CSSStyleRule).selectorText ?? "",
        text: rule.cssText,
      });
    }
  }
  return out;
}

function mount(descriptor: unknown): ElementNode {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(descriptor as never);
  node.render(host);
  return node;
}

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("shared style scope: leaving it", () => {
  it("keeps a reactive class reactive after the node leaves the shared scope", () => {
    const active = toState(false);
    const color = toState("rgb(1, 2, 3)");
    const node = mount({
      div: "x",
      class: (listener: never) => (active.get(listener) ? "on" : "off"),
      style: { color: (listener: never) => color.get(listener) },
    });
    // A second node makes the scope class genuinely shared.
    const sibling = mount({
      div: "y",
      style: { color: (listener: never) => color.get(listener) },
    });
    flushSync();
    const element = node.domElement as HTMLElement;
    expect(element.className).toContain("off");
    const sharedClass = node.scopeClass;

    color.set("rgb(9, 9, 9)");
    flushSync();
    // Both nodes subscribe to the same state, so both re-resolve to the same
    // new text and both leave the OLD shared class...
    expect(node.scopeClass).not.toBe(sharedClass);
    // ...but land back on ONE new shared class together, rather than each
    // getting its own private one: re-hashing from the settled text is what
    // lets them re-converge instead of fragmenting.
    expect(sibling.scopeClass).toBe(node.scopeClass);
    // Re-armed, not permanently private: `_scopeShared` is true again, so a
    // THIRD node whose settled style matches joins this class too.
    expect(node._scopeShared).toBe(true);
    const third = mount({
      div: "z",
      style: { color: (listener: never) => color.get(listener) },
    });
    flushSync();
    expect(third.scopeClass).toBe(node.scopeClass);

    active.set(true);
    flushSync();
    expect(element.className).toContain("on");
    expect(element.className).not.toContain("off");
    // The auto scope class survives the removal of the old one.
    expect(element.className).toContain(node.scopeClass!);
  });

  it("does not leave the shared scope when the CSSOM merely normalized the value", () => {
    // "#ffffff" is serialized back as "rgb(255, 255, 255)" (CSSOM §6).
    const color = toState("#ffffff");
    const first = mount({
      div: "a",
      style: { color: (listener: never) => color.get(listener) },
    });
    const second = mount({
      div: "b",
      style: { color: (listener: never) => color.get(listener) },
    });
    flushSync();

    expect(first._scopeShared).toBe(true);
    expect(second._scopeShared).toBe(true);
    expect((first.domElement as HTMLElement).className).toBe(
      (second.domElement as HTMLElement).className,
    );
    expect(
      liveRules().filter((rule) => rule.selector.startsWith(".")).length,
    ).toBe(1);
  });

  it("gives a diverging node its own rule and leaves the sibling's value alone", () => {
    const left = toState("rgb(1, 2, 3)");
    const right = toState("rgb(1, 2, 3)");
    const a = mount({ div: "a", style: { color: (l: never) => left.get(l) } });
    const b = mount({ div: "b", style: { color: (l: never) => right.get(l) } });
    flushSync();

    left.set("rgb(9, 9, 9)");
    flushSync();

    const rules = liveRules();
    const classOf = (node: ElementNode) =>
      (node.domElement as HTMLElement).className;
    expect(
      rules.find((rule) => rule.selector === `.${classOf(b)}`)?.text,
    ).toContain("rgb(1, 2, 3)");
    expect(
      rules.find((rule) => rule.selector === `.${classOf(a)}`)?.text,
    ).toContain("rgb(9, 9, 9)");
  });

  it("holds the registry invariant under random mount/patch/dispose traffic", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            op: fc.constantFrom("mount", "patch", "dispose"),
            index: fc.nat(7),
            color: fc.integer({ min: 0, max: 3 }),
            pad: fc.integer({ min: 0, max: 2 }),
          }),
          { minLength: 5, maxLength: 40 },
        ),
        (commands) => {
          document.head.innerHTML = "";
          document.body.innerHTML = "";
          const live: {
            node: ElementNode;
            color: ReturnType<typeof toState<string>>;
            pad: string;
          }[] = [];

          for (const command of commands) {
            if (command.op === "mount") {
              const color = toState(
                `rgb(${command.color}, ${command.color}, ${command.color})`,
              );
              const pad = `${command.pad}px`;
              live.push({
                node: mount({
                  div: "x",
                  style: { color: (l: never) => color.get(l), padding: pad },
                }),
                color,
                pad,
              });
            } else if (live.length) {
              const target = live[command.index % live.length];
              if (command.op === "patch") {
                target.color.set(
                  `rgb(${command.color}, ${command.color}, ${command.color})`,
                );
                flushSync();
              } else {
                target.node.remove();
                live.splice(live.indexOf(target), 1);
              }
            }
          }
          flushSync();

          for (const entry of live) {
            const cls = (entry.node.domElement as HTMLElement).className;
            const matching = liveRules().filter(
              (rule) => rule.selector === `.${cls}`,
            );
            // Exactly one rule backs a live node, and it carries its values.
            expect(matching.length).toBe(1);
            expect(matching[0].text).toContain(entry.color.get());
            expect(matching[0].text).toContain(entry.pad);
          }

          // One rule per DISTINCT class — nodes that agree still share.
          const distinct = new Set(
            live.map(
              (entry) => (entry.node.domElement as HTMLElement).className,
            ),
          );
          expect(
            liveRules().filter((rule) => rule.selector.startsWith(".")).length,
          ).toBe(distinct.size);

          // Every refcount reaches zero: nothing is left behind.
          for (const entry of live) entry.node.remove();
          expect(
            liveRules().filter((rule) => rule.selector.startsWith(".")).length,
          ).toBe(0);
          return true;
        },
      ),
      { numRuns: 200 },
    );
  }, 120_000);

  // CSS Cascading Level 4, "Order of Appearance": at equal specificity the
  // rule that comes LATER in the sheet wins. `StyleList.addCSS` emits a
  // node's base block before its conditional at-rules for exactly that
  // reason, so leaving the shared scope must not reorder them.
  it("keeps the base block before its @media block after a detach", () => {
    const display = toState("none");
    const style = () => ({
      display: (listener: never) => display.get(listener),
      color: "rgb(1, 2, 3)",
      "@media (max-width: 600px)": { display: "block" },
    });
    const node = mount({ div: "x", style: style() });
    mount({ div: "y", style: style() });
    flushSync();

    display.set("flex");
    flushSync();

    const cls = (node.domElement as HTMLElement).className;
    const rules = liveRules();
    const baseIndex = rules.findIndex((rule) => rule.selector === `.${cls}`);
    const mediaIndex = rules.findIndex(
      (rule) => !rule.selector && rule.text.includes(`.${cls} `),
    );
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(mediaIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeLessThan(mediaIndex);
  });
});
