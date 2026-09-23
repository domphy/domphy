// Truth source: Vue 3 `packages/runtime-core/src/scheduler.ts` —
// `const RECURSION_LIMIT = 100` + `checkRecursiveUpdates()`, which counts
// re-runs of the same job inside ONE flush, reports "Maximum recursive updates
// exceeded" and `continue`s past the job. Domphy inherits the limit and the
// behaviour; only the flush boundary differs (Vue: one `flushJobs()` call;
// Domphy: until notifiers AND the reaction queue have both settled, because a
// reaction's write leaves through a Notifier microtask).
import { afterEach, describe, expect, it, vi } from "vitest";
import { effect, flushSync, toState } from "../src/index.ts";

const disposers: Array<() => void> = [];

afterEach(() => {
  while (disposers.length) disposers.pop()?.();
  vi.restoreAllMocks();
});

function track(dispose: () => void): () => void {
  disposers.push(dispose);
  return dispose;
}

describe("Vue 3 scheduler: RECURSION_LIMIT stops a self-feeding effect", () => {
  it("a cross-effect write cycle (A writes B's source, B writes A's) is stopped and reported", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const a = toState(0);
    const b = toState(0);
    let runsA = 0;
    let runsB = 0;

    track(
      effect(() => {
        runsA++;
        b.set(a.get() + 1);
      }),
    );
    track(
      effect(() => {
        runsB++;
        a.set(b.get() + 1);
      }),
    );

    // A macrotask turn only arrives once the microtask chain stops feeding
    // itself — i.e. only if the guard actually broke the cycle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      error.mock.calls.some((call) =>
        String(call[0]).includes("Maximum recursive updates exceeded"),
      ),
    ).toBe(true);
    // Vue skips the job for the rest of the flush rather than running forever.
    expect(runsA).toBeLessThanOrEqual(102);
    expect(runsB).toBeLessThanOrEqual(102);
    expect(runsA).toBeGreaterThan(100);
  });

  it("a self-feeding effect (writes the state it reads) is stopped too", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const count = toState(0);
    let runs = 0;

    track(
      effect(() => {
        runs++;
        count.set(count.get() + 1);
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(
      error.mock.calls.some((call) =>
        String(call[0]).includes("Maximum recursive updates exceeded"),
      ),
    ).toBe(true);
    expect(runs).toBeLessThanOrEqual(102);
  });
});

describe("the limit counts per flush, not per process", () => {
  it("1000 iterations of set() + flushSync() do not trip it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const count = toState(0);
    let runs = 0;

    track(
      effect(() => {
        count.get();
        runs++;
      }),
    );

    for (let index = 1; index <= 1000; index++) {
      count.set(index);
      flushSync();
    }

    expect(runs).toBe(1001); // the initial run + one per settled flush
    expect(error).not.toHaveBeenCalled();
  });

  it("a long chain of distinct effects is unaffected — the count is per job", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const source = toState(0);
    const links = Array.from({ length: 300 }, () => toState(0));
    let tail = 0;

    track(
      effect(() => {
        links[0].set(source.get() + 1);
      }),
    );
    for (let index = 1; index < links.length; index++) {
      track(
        effect(() => {
          links[index].set(links[index - 1].get() + 1);
        }),
      );
    }
    track(
      effect(() => {
        tail = links[links.length - 1].get();
      }),
    );

    source.set(1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(tail).toBe(links.length + 1);
    expect(error).not.toHaveBeenCalled();
  });
});
