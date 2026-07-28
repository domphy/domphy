import { describe, expect, it } from "vitest";
import { mergeAttributes } from "../../src/extensions/mergeAttributes";

describe("mergeAttributes", () => {
  it("takes the last value for ordinary keys", () => {
    expect(mergeAttributes({ id: "a", title: "keep" }, { id: "b" })).toEqual({
      id: "b",
      title: "keep",
    });
  });

  it("concatenates classes without repeating one", () => {
    expect(
      mergeAttributes({ class: "prose lead" }, { class: "lead wide" }),
    ).toEqual({
      class: "prose lead wide",
    });
  });

  it("merges style declarations per property", () => {
    expect(
      mergeAttributes(
        { style: "color: red; margin: 0" },
        { style: "color: blue" },
      ),
    ).toEqual({ style: "color: blue; margin: 0" });
  });

  it("skips empty sources", () => {
    expect(mergeAttributes(null, undefined, { id: "a" })).toEqual({ id: "a" });
  });
});
