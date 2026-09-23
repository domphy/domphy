// Truth source: CSSOM §6.2 `insertRule()` — "if the rule cannot be parsed,
// throw a SyntaxError" — combined with what a real engine actually parses.
// Measured in Chromium 141 (playwright 1.62) against a live stylesheet:
//   x::-moz-range-track        -> SyntaxError   (Blink does not know it)
//   x::-webkit-slider-thumb    -> accepted
//   x::-definitely-not-a-pseudo-> SyntaxError
// So a patch that styles a native control ships selectors the current engine
// WILL reject on every page load, and that rejection is the spec's cross-engine
// no-op, not an author bug. A non-vendor selector that fails to parse still is.
import { describe, expect, it, vi } from "vitest";
import { StyleRule } from "../src/classes/StyleRule.ts";
import { ElementNode } from "../src/index.ts";

// Minimal CSSStyleSheet stand-in that rejects everything, so the test exercises
// the catch branch without depending on jsdom's own selector parser.
function rejectingSheet(): CSSStyleSheet {
  return {
    cssRules: { length: 0 } as unknown as CSSRuleList,
    insertRule() {
      throw new DOMException("failed to parse the rule", "SyntaxError");
    },
  } as unknown as CSSStyleSheet;
}

describe("StyleRule.render: a rejected selector only warns when it is the author's fault", () => {
  it("stays silent for a vendor-prefixed pseudo the engine cannot know", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const host = new ElementNode({ div: null });
    for (const selector of [
      ".x::-moz-range-track",
      ".x::-webkit-slider-thumb",
      ".x:-ms-input-placeholder",
    ]) {
      const rule = new StyleRule(selector, host);
      rule.insertStyle("color", "red");
      rule.render(rejectingSheet());
    }
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("still warns for a selector with no vendor prefix", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const host = new ElementNode({ div: null });
    const rule = new StyleRule(".x::totally-made-up", host);
    rule.insertStyle("color", "red");
    rule.render(rejectingSheet());
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("Failed to insert rule");
    warn.mockRestore();
  });
});
