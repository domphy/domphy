// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWindowVirtualizer } from "../src/domphy/index";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createWindowVirtualizer", () => {
  it("computes the visible range from the window rect without any casts", () => {
    // No `as any` anywhere — the whole point of the factory is that the
    // Window scroll target typechecks directly.
    const list = createWindowVirtualizer<HTMLDivElement>({
      count: 1000,
      estimateSize: () => 32,
    });

    expect(list.getTotalSize()).toBe(1000 * 32);

    list.setScrollElement(window);
    const items = list.getVirtualItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.index).toBe(0);
    // jsdom's default viewport is 1024x768, so ~768/32 items fit (plus
    // overscan) — far fewer than the full count.
    expect(items.length).toBeLessThan(1000);

    list.destroy();
  });

  it("bumps version when the window scrolls", async () => {
    const list = createWindowVirtualizer<HTMLDivElement>({
      count: 500,
      estimateSize: () => 20,
    });
    list.setScrollElement(window);

    let calls = 0;
    list.version(() => calls++);
    const versionBefore = list.version();

    window.dispatchEvent(new Event("scroll"));

    expect(list.version()).toBeGreaterThan(versionBefore);
    // Version-State notifications to listeners are microtask-batched.
    await flush();
    expect(calls).toBeGreaterThan(0);

    list.destroy();
  });

  it("scrollToOffset routes through windowScroll (window.scrollTo)", () => {
    const list = createWindowVirtualizer<HTMLDivElement>({
      count: 100,
      estimateSize: () => 20,
    });
    list.setScrollElement(window);

    // jsdom reports documentElement.scrollHeight as 0, which the core reads
    // for its max-scroll clamp (getMaxScrollOffset) — stub it to the virtual
    // content height so 640 is a legal target (in a real browser the spacer
    // element gives the document its height).
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      configurable: true,
    });

    // jsdom's window.scrollTo is a no-op stub; spy on it to prove the
    // window scroll function is the wired scrollToFn. Earlier calls may
    // carry other offsets (initial scroll, settling retries) — assert the
    // requested offset was among them.
    const spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    list.scrollToOffset(640);
    expect(spy).toHaveBeenCalled();
    const tops = spy.mock.calls.map((call) => (call[0] as ScrollToOptions).top);
    expect(tops).toContain(640);

    spy.mockRestore();
    delete (document.documentElement as { scrollHeight?: number }).scrollHeight;
    list.destroy();
  });

  it("stops observing the window after destroy()", () => {
    const list = createWindowVirtualizer<HTMLDivElement>({
      count: 100,
      estimateSize: () => 20,
    });
    list.setScrollElement(window);
    const versionAfterMount = list.version();

    list.destroy();
    window.dispatchEvent(new Event("scroll"));

    // The version State is disposed on destroy and the window listeners are
    // removed, so a post-destroy scroll cannot bump anything.
    expect(list.version()).toBe(versionAfterMount);
  });
});
