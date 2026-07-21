// @vitest-environment jsdom
// Mechanical lifecycle sweep over EVERY exported block factory. This is the
// cheap 100%-coverage tier of the blocks QA pyramid: it drives each block
// through the reused-node lifecycle transitions that produced the framework's
// hardest bug class (mount -> ancestor re-render with a FRESH factory closure
// on the SAME DOM nodes -> unmount), and records runtime-hygiene violations:
//
//   construct-error   factory() threw before returning an element
//   render-error      ElementNode render/patch/removal threw
//   console-error     console.error fired during the block's lifecycle
//   listener-leak     window/document listeners added but never removed
//   timer-leak        timers/rAF still re-scheduling after unmount
//   dom-residue       elements left in document.body after unmount
//
// Results are written to .lifecycle-report.json (same convention as
// .axe-scan-report.json); the single assertion at the end keeps the suite
// green while the report drives the fix fan-out. Once the report is clean,
// tighten `KNOWN_CLEAN` into a hard regression gate.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterAll, describe, expect, it, vi } from "vitest";
import * as blocks from "../src/index.js";

vi.setConfig({ testTimeout: 30000 });

// --- jsdom capability stubs (match existing per-test stubs in this suite) ---

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (!("IntersectionObserver" in globalThis)) {
  (globalThis as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
if (!window.matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
// jsdom has no canvas implementation — hand out a no-op 2D/WebGL context so
// canvas-based effects run their loops harmlessly (same pattern as
// confetti.test.ts).
const noopCanvasContext = new Proxy(
  {},
  {
    get: (_target, property) => (property === "canvas" ? undefined : () => {}),
    set: () => true,
  },
);
HTMLCanvasElement.prototype.getContext = (() =>
  noopCanvasContext) as typeof HTMLCanvasElement.prototype.getContext;
if (!Element.prototype.scrollTo) {
  (Element.prototype as any).scrollTo = () => {};
}
if (!Element.prototype.scrollIntoView) {
  (Element.prototype as any).scrollIntoView = () => {};
}
// jsdom has no <dialog> method implementation — same stub as the existing
// sidebar/dashboard block tests (show/showModal/close mutate `open`).
if (!(HTMLDialogElement.prototype as any).showModal) {
  (HTMLDialogElement.prototype as any).showModal = function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
}
if (!(HTMLDialogElement.prototype as any).show) {
  (HTMLDialogElement.prototype as any).show = function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
}
if (!(HTMLDialogElement.prototype as any).close) {
  (HTMLDialogElement.prototype as any).close = function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute("open");
  };
}

// --- report plumbing --------------------------------------------------------

interface BlockReport {
  block: string;
  failures: Array<{ kind: string; detail: string }>;
}

const reports: BlockReport[] = [];

afterAll(() => {
  const failing = reports.filter((r) => r.failures.length > 0);
  const summary = {
    generatedAt: "lifecycle-harness",
    total: reports.length,
    failing: failing.length,
    byKind: failing
      .flatMap((r) => r.failures.map((f) => f.kind))
      .reduce<Record<string, number>>((acc, kind) => {
        acc[kind] = (acc[kind] ?? 0) + 1;
        return acc;
      }, {}),
    blocks: failing,
  };
  // Trailing newline required: biome format errors on EOF without `\n`, and
  // `pnpm check` would fail if this artifact is left dirty after the suite.
  writeFileSync(
    join(__dirname, "..", ".lifecycle-report.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
});

// --- the sweep ---------------------------------------------------------------

const factories = Object.entries(blocks).filter(
  ([, value]) => typeof value === "function",
) as Array<[string, (props?: unknown) => DomphyElement]>;

describe(`block lifecycle sweep (${factories.length} factories)`, () => {
  for (const [name, factory] of factories) {
    it(name, () => {
      const failures: Array<{ kind: string; detail: string }> = [];
      const report: BlockReport = { block: name, failures };
      reports.push(report);

      const consoleErrors: string[] = [];
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation((...args: unknown[]) => {
          consoleErrors.push(args.map(String).join(" ").slice(0, 300));
        });

      // Track global listener balance across the whole lifecycle.
      const listenerLog: Array<{ op: string; type: string }> = [];
      const targets: EventTarget[] = [window, document, document.body];
      const originalAdd = EventTarget.prototype.addEventListener;
      const originalRemove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (
        type: string,
        ...rest: unknown[]
      ) {
        if (targets.includes(this)) listenerLog.push({ op: "add", type });
        return (originalAdd as any).call(this, type, ...rest);
      };
      EventTarget.prototype.removeEventListener = function (
        type: string,
        ...rest: unknown[]
      ) {
        if (targets.includes(this)) listenerLog.push({ op: "remove", type });
        return (originalRemove as any).call(this, type, ...rest);
      };

      vi.useFakeTimers();
      try {
        // 1. Construct — a factory must return a mountable element with no props.
        let firstElement: DomphyElement | null = null;
        try {
          firstElement = factory();
        } catch (error) {
          failures.push({
            kind: "construct-error",
            detail: String(error).slice(0, 300),
          });
          return;
        }
        if (!firstElement || typeof firstElement !== "object") {
          failures.push({
            kind: "construct-error",
            detail: `factory returned ${typeof firstElement}`,
          });
          return;
        }

        // 2. Mount inside a reactive keyed row — the real-world shape whose
        // re-render creates a FRESH factory closure on REUSED DOM nodes.
        const items = toState([1]);
        const refresh = toState(0);
        const host = document.createElement("div");
        document.body.appendChild(host);
        let node: ElementNode | null = null;
        try {
          node = new ElementNode({
            div: [
              {
                div: (l: any) => {
                  refresh.get(l);
                  return items.get(l).map((id: number) => ({
                    div: [factory()],
                    _key: id,
                  }));
                },
              },
            ],
          } as DomphyElement);
          node.render(host);
          flushSync();
          vi.advanceTimersByTime(500);
          flushSync();

          // 3. Ancestor re-renders — fresh closures on reused nodes.
          for (let round = 1; round <= 2; round++) {
            refresh.set(round);
            flushSync();
            vi.advanceTimersByTime(250);
            flushSync();
          }

          // 4. Unmount the block's row, then the whole tree.
          items.set([]);
          flushSync();
          vi.advanceTimersByTime(250);
          flushSync();
          node.remove();
          flushSync();
        } catch (error) {
          failures.push({
            kind: "render-error",
            detail: String(error).slice(0, 300),
          });
          return;
        }

        // 5. Post-unmount hygiene.
        const timersBefore = vi.getTimerCount();
        vi.advanceTimersByTime(5000);
        const timersAfter = vi.getTimerCount();
        // A one-shot straggler drains to zero; a loop that keeps re-arming
        // after unmount stays non-zero however far time advances.
        if (timersAfter > 0 && timersAfter >= timersBefore) {
          failures.push({
            kind: "timer-leak",
            detail: `${timersAfter} timer(s)/rAF still re-arming 5s after unmount`,
          });
        }

        const balance = new Map<string, number>();
        for (const entry of listenerLog) {
          balance.set(
            entry.type,
            (balance.get(entry.type) ?? 0) + (entry.op === "add" ? 1 : -1),
          );
        }
        const leaked = [...balance.entries()].filter(([, count]) => count > 0);
        if (leaked.length > 0) {
          failures.push({
            kind: "listener-leak",
            detail: leaked
              .map(([type, count]) => `${type}(+${count})`)
              .join(", "),
          });
        }

        host.remove();
        const residue = document.body.children.length;
        if (residue > 0) {
          failures.push({
            kind: "dom-residue",
            detail: `${residue} element(s) left in body: ${Array.from(
              document.body.children,
            )
              .map((child) => child.tagName.toLowerCase())
              .slice(0, 5)
              .join(", ")}`,
          });
        }

        if (consoleErrors.length > 0) {
          failures.push({
            kind: "console-error",
            detail: consoleErrors[0],
          });
        }
      } finally {
        EventTarget.prototype.addEventListener = originalAdd;
        EventTarget.prototype.removeEventListener = originalRemove;
        errorSpy.mockRestore();
        vi.useRealTimers();
        document.body.innerHTML = "";
      }

      // The sweep is a REPORT, not a gate (yet): a block's failures land in
      // .lifecycle-report.json for the fix fan-out. Keep the test itself
      // green so unrelated CI stays unblocked while the backlog is worked.
      expect(report.block).toBe(name);
    });
  }
});
