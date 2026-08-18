// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVirtualizer } from "../src/domphy/index";
import type { Virtualizer } from "../src/index";

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

// Fixed-viewport rect observer: reports a stable 300px-tall scroll viewport so
// the virtualizer computes a non-empty visible range under jsdom (where
// offsetHeight is 0). Returns a no-op unsubscribe.
function fixedRect<TScroll extends Element, TItem extends Element>(
  _instance: Virtualizer<TScroll, TItem>,
  cb: (rect: { width: number; height: number }) => void,
) {
  cb({ width: 300, height: 300 });
  return () => {};
}

describe("createVirtualizer reactivity", () => {
  it("bumps version and changes virtual items when the element scrolls", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 1000,
      estimateSize: () => 32,
      observeElementRect: fixedRect,
    });

    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);

    const versionBefore = list.version();
    const itemsBefore = list.getVirtualItems();
    expect(itemsBefore.length).toBeGreaterThan(0);
    expect(itemsBefore[0]?.index).toBe(0);

    // Scroll far down and notify via the real DOM scroll listener wired by
    // the adapter through observeElementOffset.
    el.scrollTop = 9000;
    el.dispatchEvent(new Event("scroll"));

    expect(list.version()).toBeGreaterThan(versionBefore);
    const itemsAfter = list.getVirtualItems();
    expect(itemsAfter.length).toBeGreaterThan(0);
    // The visible window moved forward.
    expect(itemsAfter[0]?.index).toBeGreaterThan(itemsBefore[0]?.index ?? 0);

    list.destroy();
    el.remove();
  });

  it("notifies a subscribed version listener on scroll", async () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 500,
      estimateSize: () => 20,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);

    let calls = 0;
    list.version(() => calls++);

    el.scrollTop = 4000;
    el.dispatchEvent(new Event("scroll"));

    // Version-State notifications to listeners are microtask-batched.
    await flush();
    expect(calls).toBeGreaterThan(0);

    list.destroy();
    el.remove();
  });
});

describe("createVirtualizer anchorTo: 'end' pure-append fast path", () => {
  it("skips anchor-key resolution for a plain append but still resolves it on a real edge-key change", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 1000,
      estimateSize: () => 32,
      observeElementRect: fixedRect,
      anchorTo: "end",
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);

    const spy = vi.spyOn(list.virtualizer, "getVirtualItemForOffset");

    // A plain append: every existing item keeps its key/order, only the
    // count grows past the old end. No anchor recomputation is needed.
    list.setOptions({ count: 1001 });
    expect(spy).not.toHaveBeenCalled();

    // A genuine edge-key change (here: the item at index 0 gets a new key,
    // simulating a prepend) still needs anchor resolution.
    const originalGetItemKey = list.virtualizer.options.getItemKey;
    list.setOptions({
      count: 1002,
      getItemKey: (index) =>
        index === 0 ? "prepended" : originalGetItemKey(index - 1),
    });
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
    list.destroy();
    el.remove();
  });
});

describe("createVirtualizer setOptions size cache", () => {
  // Adapter setOptions used to call virtualizer.measure() on every update,
  // which wipes itemSizeCache. A count-only change (infinite-scroll append)
  // must keep measured sizes; the core rebuilds measurements from the cache.
  it("preserves measured sizes on a count-only setOptions", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 10,
      estimateSize: () => 50,
      observeElementRect: fixedRect,
      measureElement: () => 80,
    });
    const scroll = document.createElement("div");
    document.body.appendChild(scroll);
    list.setScrollElement(scroll);

    const row = document.createElement("div");
    row.setAttribute("data-index", "3");
    scroll.appendChild(row);
    list.measureElement(row);

    expect(list.getTotalSize()).toBe(9 * 50 + 80);
    expect(list.virtualizer.itemSizeCache.get(3)).toBe(80);

    const versionBefore = list.version();
    list.setOptions({ count: 20 });

    // Measured key 3 is still 80; the 19 unmeasured items stay at 50.
    expect(list.virtualizer.itemSizeCache.get(3)).toBe(80);
    expect(list.getTotalSize()).toBe(19 * 50 + 80);
    // Subscribers still learn about the count change (version bump).
    expect(list.version()).toBeGreaterThan(versionBefore);

    list.destroy();
    scroll.remove();
  });

  it("still applies a count-only update when nothing has been measured", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 10,
      estimateSize: () => 50,
      observeElementRect: fixedRect,
    });
    expect(list.getTotalSize()).toBe(500);
    list.setOptions({ count: 20 });
    expect(list.getTotalSize()).toBe(1000);
    list.destroy();
  });
});

describe("createVirtualizer dynamic measurement (data-index contract)", () => {
  // The virtualizer resolves an item's index from the element's `data-index`
  // attribute (upstream indexFromElement). Every measured row MUST render it.
  it("measureElement resizes the item when data-index is set", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 10,
      estimateSize: () => 50,
      observeElementRect: fixedRect,
      // Deterministic size under jsdom (offsetHeight is 0 there).
      measureElement: () => 80,
    });
    const scroll = document.createElement("div");
    document.body.appendChild(scroll);
    list.setScrollElement(scroll);

    const row = document.createElement("div");
    row.setAttribute("data-index", "3");
    scroll.appendChild(row);

    list.measureElement(row);
    expect(list.getTotalSize()).toBe(9 * 50 + 80);

    list.destroy();
    scroll.remove();
  });

  it("measureElement without data-index warns and does not resize", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 10,
      estimateSize: () => 50,
      observeElementRect: fixedRect,
      measureElement: () => 80,
    });
    const scroll = document.createElement("div");
    document.body.appendChild(scroll);
    list.setScrollElement(scroll);

    const row = document.createElement("div"); // no data-index
    scroll.appendChild(row);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    list.measureElement(row);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("data-index"));
    expect(list.getTotalSize()).toBe(10 * 50);

    warn.mockRestore();
    list.destroy();
    scroll.remove();
  });
});

describe("createVirtualizer cleanup", () => {
  it("setScrollElement(null) runs the previous mount cleanup (detaches scroll listener)", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 200,
      estimateSize: () => 25,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);

    const removeSpy = vi.spyOn(el, "removeEventListener");
    list.setScrollElement(el);

    // Switching to null must tear down the prior mount: the scroll listener
    // is detached and further scroll events no longer bump the version.
    list.setScrollElement(null);
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));

    const versionAfterDetach = list.version();
    el.scrollTop = 5000;
    el.dispatchEvent(new Event("scroll"));
    expect(list.version()).toBe(versionAfterDetach);

    list.destroy();
    removeSpy.mockRestore();
    el.remove();
  });

  it("destroy() detaches observers so later scrolls do not bump version", async () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 200,
      estimateSize: () => 25,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);

    const removeSpy = vi.spyOn(el, "removeEventListener");
    let calls = 0;
    list.version(() => calls++);

    list.destroy();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));

    el.scrollTop = 5000;
    el.dispatchEvent(new Event("scroll"));
    // The version State is disposed and observers detached: no notifications.
    await flush();
    expect(calls).toBe(0);

    removeSpy.mockRestore();
    el.remove();
  });
});

describe("createVirtualizer destroy() hardening", () => {
  it("setScrollElement after destroy() warns once and does not re-mount observers", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 200,
      estimateSize: () => 25,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);

    list.destroy();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const addSpy = vi.spyOn(el, "addEventListener");

    list.setScrollElement(el);
    list.setScrollElement(el); // second call: still only one warning

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("destroy()");
    // No scroll listener was attached — the disposed handle stays dead.
    expect(addSpy).not.toHaveBeenCalled();

    warn.mockRestore();
    addSpy.mockRestore();
    el.remove();
  });

  it("scroll methods are safe to destructure from the handle", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 200,
      estimateSize: () => 25,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);

    const scrollTo = vi.fn();
    (el as HTMLDivElement & { scrollTo: unknown }).scrollTo = scrollTo;

    // Destructured — no `handle.` receiver. Must still hit the virtualizer.
    const { scrollToOffset, scrollToIndex, scrollBy, scrollToEnd } = list;
    expect(() => {
      scrollToOffset(100);
      scrollToIndex(10);
      scrollBy(50);
      scrollToEnd();
    }).not.toThrow();
    expect(scrollTo).toHaveBeenCalled();

    list.destroy();
    el.remove();
  });

  it("post-destroy virtualizer notifications do not warn on the disposed version state", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 200,
      estimateSize: () => 25,
      observeElementRect: fixedRect,
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    list.setScrollElement(el);
    list.destroy();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // The virtualizer object outlives the handle; direct onChange (as fired
    // by e.g. a stray measureElement/scroll call) must not write to the
    // disposed version State.
    list.virtualizer.options.onChange?.(list.virtualizer, false);
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
    el.remove();
  });
});
