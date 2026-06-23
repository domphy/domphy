// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserHistory } from "../src/history";

beforeEach(() => {
  // Reset history to a known, single entry before each test.
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createBrowserHistory", () => {
  it("seeds the current entry with a __domphyIndex of 0", () => {
    createBrowserHistory();
    expect(
      (window.history.state as { __domphyIndex?: number } | null)
        ?.__domphyIndex,
    ).toBe(0);
  });

  it("sets scrollRestoration to manual when the browser supports it", () => {
    // jsdom 29 does not implement `scrollRestoration`; inject it to exercise
    // the supported branch (the code guards with `"scrollRestoration" in ...`).
    const hadProperty = "scrollRestoration" in window.history;
    if (!hadProperty) {
      Object.defineProperty(window.history, "scrollRestoration", {
        configurable: true,
        writable: true,
        value: "auto",
      });
    }
    try {
      createBrowserHistory();
      expect(window.history.scrollRestoration).toBe("manual");
    } finally {
      if (!hadProperty) {
        delete (window.history as { scrollRestoration?: string })
          .scrollRestoration;
      }
    }
  });

  it("increments __domphyIndex on push and keeps it on replace", () => {
    const history = createBrowserHistory();
    history.push("/a");
    expect(
      (window.history.state as { __domphyIndex: number }).__domphyIndex,
    ).toBe(1);
    expect(window.location.pathname).toBe("/a");

    history.push("/b");
    expect(
      (window.history.state as { __domphyIndex: number }).__domphyIndex,
    ).toBe(2);

    // replace keeps the index but swaps the URL.
    history.replace("/b2");
    expect(
      (window.history.state as { __domphyIndex: number }).__domphyIndex,
    ).toBe(2);
    expect(window.location.pathname).toBe("/b2");
  });

  it("adopts an existing __domphyIndex from history state", () => {
    window.history.replaceState({ __domphyIndex: 7 }, "", "/deep");
    const history = createBrowserHistory();
    // A push from index 7 advances to 8.
    history.push("/deeper");
    expect(
      (window.history.state as { __domphyIndex: number }).__domphyIndex,
    ).toBe(8);
  });

  it("saves and restores scroll positions per history entry", () => {
    const history = createBrowserHistory();
    // Save at index 0.
    history.saveScroll?.({ x: 0, y: 120 });
    expect(history.readScroll?.()).toEqual({ x: 0, y: 120 });

    // After a push (index 1) no scroll has been saved yet.
    history.push("/next");
    expect(history.readScroll?.()).toBeNull();

    // Save at index 1.
    history.saveScroll?.({ x: 0, y: 999 });
    expect(history.readScroll?.()).toEqual({ x: 0, y: 999 });
  });

  it("notifies listeners on popstate and re-reads the index", () => {
    const history = createBrowserHistory();
    history.push("/a"); // index 1
    history.push("/b"); // index 2

    const seen: string[] = [];
    const release = history.listen((url) => seen.push(url.pathname));

    // Simulate the browser moving back to index 1.
    window.history.replaceState({ __domphyIndex: 1 }, "", "/a");
    window.dispatchEvent(new Event("popstate"));

    expect(seen).toEqual(["/a"]);

    // After release, no further notifications arrive.
    release();
    window.dispatchEvent(new Event("popstate"));
    expect(seen).toEqual(["/a"]);
  });

  it("restores the saved scroll for the entry returned to via popstate", () => {
    const history = createBrowserHistory();
    // Save scroll at index 0, then navigate forward.
    history.saveScroll?.({ x: 0, y: 50 });
    history.push("/a"); // index 1

    // Move back to index 0 via popstate; the listener re-reads the index.
    const release = history.listen(() => {});
    window.history.replaceState({ __domphyIndex: 0 }, "", "/");
    window.dispatchEvent(new Event("popstate"));

    expect(history.readScroll?.()).toEqual({ x: 0, y: 50 });
    release();
  });

  it("exposes the current url", () => {
    window.history.replaceState({ __domphyIndex: 0 }, "", "/path?q=1#frag");
    const history = createBrowserHistory();
    const url = history.url();
    expect(url.pathname).toBe("/path");
    expect(url.search).toBe("?q=1");
    expect(url.hash).toBe("#frag");
  });
});
