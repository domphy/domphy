/**
 * Minimal history abstraction so the router runs against the real browser
 * history, an in-memory stack (tests, embedded demos) or nothing at all (SSR).
 */

export interface HistoryAdapter {
  url(): URL;
  push(url: string): void;
  replace(url: string): void;
  go(delta: number): void;
  /** Subscribes to external navigation (popstate / memory go). Returns a release function. */
  listen(callback: (url: URL) => void): () => void;
  /** Saves and restores scroll positions per history entry. */
  saveScroll?(position: { x: number; y: number }): void;
  readScroll?(): { x: number; y: number } | null;
}

interface BrowserHistoryState {
  __domphyIndex: number;
}

export function createBrowserHistory(): HistoryAdapter {
  const scrollPositions = new Map<number, { x: number; y: number }>();
  let index =
    (window.history.state as BrowserHistoryState | null)?.__domphyIndex ?? 0;
  if (window.history.state?.__domphyIndex === undefined) {
    window.history.replaceState({ __domphyIndex: index }, "");
  }
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  return {
    url: () => new URL(window.location.href),
    push: (url) => {
      index++;
      window.history.pushState({ __domphyIndex: index }, "", url);
    },
    replace: (url) => {
      window.history.replaceState({ __domphyIndex: index }, "", url);
    },
    go: (delta) => window.history.go(delta),
    listen: (callback) => {
      const handler = () => {
        index =
          (window.history.state as BrowserHistoryState | null)?.__domphyIndex ??
          0;
        callback(new URL(window.location.href));
      };
      window.addEventListener("popstate", handler);
      return () => window.removeEventListener("popstate", handler);
    },
    saveScroll: (position) => scrollPositions.set(index, position),
    readScroll: () => scrollPositions.get(index) ?? null,
  };
}

const MEMORY_ORIGIN = "http://localhost";

export function createMemoryHistory(initial = "/"): HistoryAdapter {
  const stack: string[] = [initial];
  let index = 0;
  const listeners = new Set<(url: URL) => void>();

  return {
    url: () => new URL(stack[index], MEMORY_ORIGIN),
    push: (url) => {
      stack.splice(index + 1);
      stack.push(url);
      index++;
    },
    replace: (url) => {
      stack[index] = url;
    },
    go: (delta) => {
      const next = Math.min(Math.max(index + delta, 0), stack.length - 1);
      if (next === index) return;
      index = next;
      const url = new URL(stack[index], MEMORY_ORIGIN);
      for (const listener of listeners) listener(url);
    },
    listen: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}
