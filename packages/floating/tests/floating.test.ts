// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  shift,
} from "../src/index";

describe("@domphy/floating", () => {
  it("exposes the floating-ui dom API", () => {
    expect(typeof computePosition).toBe("function");
    expect(typeof autoUpdate).toBe("function");
    expect(typeof offset).toBe("function");
    expect(typeof flip).toBe("function");
    expect(typeof shift).toBe("function");
    expect(typeof arrow).toBe("function");
  });

  it("computes a position with middleware", async () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);

    const placement: Placement = "bottom";
    const result = await computePosition(reference, floating, {
      placement,
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    });

    expect(typeof result.x).toBe("number");
    expect(typeof result.y).toBe("number");
    expect(result.placement).toBeDefined();
    expect(result.middlewareData).toBeDefined();

    reference.remove();
    floating.remove();
  });

  it("autoUpdate returns a cleanup function", () => {
    const reference = document.createElement("div");
    const floating = document.createElement("div");
    document.body.append(reference, floating);
    const cleanup = autoUpdate(reference, floating, () => {});
    expect(typeof cleanup).toBe("function");
    cleanup();
    reference.remove();
    floating.remove();
  });
});
