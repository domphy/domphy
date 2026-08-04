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

beforeEach(() => {
  localStorage.clear();
  document.documentElement.setAttribute("data-theme", "light");
  document.body.innerHTML = "";
});

describe("RUNTIME_SCRIPT theme bootstrap", () => {
  it("applies a stored dark preference to <html>", () => {
    localStorage.setItem("dp-theme", "dark");
    evalBootstrap();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps the SSR default when no preference is stored", () => {
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
