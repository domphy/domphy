// @vitest-environment jsdom
/**
 * Regression tests for the inline anti-FOUC runtime script (RUNTIME_SCRIPT):
 * the theme toggle must round-trip light<->dark and persist `dp-theme` as
 * "light"/"dark" only — theme vars are scoped [data-theme="light"]/["dark"],
 * so an empty data-theme kills every var(--…) reference.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { RUNTIME_SCRIPT } from "../src/build.ts";

// Evaluate the script with `addEventListener` shadowed by a no-op so repeated
// evaluations (bootstrap scenarios) never accumulate global listeners.
function evalBootstrap() {
  new Function("addEventListener", RUNTIME_SCRIPT)(() => {});
}

function clickThemeToggle() {
  const button = document.createElement("button");
  button.setAttribute("data-theme-toggle", "");
  document.body.appendChild(button);
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  button.remove();
}

// jsdom ships no matchMedia, which is also the "unavailable" case the script
// guards. Install a minimal one when a test needs a definite answer.
function stubPrefersDark(matches: boolean) {
  (window as unknown as { matchMedia: unknown }).matchMedia = (
    query: string,
  ) => ({
    matches: matches && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute("data-theme", "light");
  document.body.innerHTML = "";
  // Removing the property, not setting it undefined: `'matchMedia' in window`
  // is what an engine without it actually reports, and that is the state the
  // bootstrap has to survive.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe("RUNTIME_SCRIPT theme bootstrap", () => {
  it("applies a stored dark preference to <html>", () => {
    localStorage.setItem("dp-theme", "dark");
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  // Truth source: the OS/browser colour preference exposed as
  // prefers-color-scheme, which the document already advertises support for
  // via <meta name="color-scheme" content="light dark">. VitePress, Starlight
  // and Docusaurus all follow it when the visitor has made no explicit choice.
  it("follows prefers-color-scheme when no preference is stored", () => {
    stubPrefersDark(true);
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    document.documentElement.setAttribute("data-theme", "light");
    stubPrefersDark(false);
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("lets a stored choice override the system preference", () => {
    stubPrefersDark(true);
    localStorage.setItem("dp-theme", "light");
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("keeps the SSR default when matchMedia is unavailable", () => {
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("ignores a legacy empty-string preference (old toggle bug state)", () => {
    localStorage.setItem("dp-theme", "");
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("RUNTIME_SCRIPT theme toggle", () => {
  // Single evaluation: the click listener is registered once for all
  // assertions in this block.
  new Function(RUNTIME_SCRIPT)();

  it("toggles light -> dark and persists dp-theme=dark", () => {
    clickThemeToggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("dp-theme")).toBe("dark");
  });

  it("toggles dark -> light and persists dp-theme=light (never empty)", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    clickThemeToggle();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("dp-theme")).toBe("light");
  });

  it("round-trips repeatedly without ever producing an empty theme", () => {
    for (const expected of ["dark", "light", "dark", "light"]) {
      clickThemeToggle();
      expect(document.documentElement.getAttribute("data-theme")).toBe(
        expected,
      );
      expect(localStorage.getItem("dp-theme")).toBe(expected);
    }
  });
});
