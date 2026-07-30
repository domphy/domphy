import { describe, expect, it } from "vitest";
import { invariant } from "../src/invariant";

describe("invariant", () => {
  it("throws a generic error without a code", () => {
    expect(() => invariant()).toThrowError("Invariant failed");
  });

  it("includes the code so production failures stay identifiable", () => {
    expect(() => invariant("already-dehydrated")).toThrowError(
      "Invariant failed (already-dehydrated)",
    );
  });

  it("always throws (never returns)", () => {
    for (const code of [undefined, "notfound-boundary", "duplicate-route-id"]) {
      expect(() => invariant(code)).toThrowError(Error);
    }
  });
});
