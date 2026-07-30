import { describe, expect, it } from "vitest";
import { applyPlaygroundLayout } from "../playground-layout.js";

describe("applyPlaygroundLayout", () => {
  it("hides TOC aside when the page has a playground, without touching sidebar", () => {
    const frontmatter: Record<string, unknown> = {};
    applyPlaygroundLayout(frontmatter, true);
    expect(frontmatter.aside).toBe(false);
    expect(frontmatter.sidebar).toBeUndefined();
    expect(frontmatter.layout).toBeUndefined();
  });

  it("does not set aside when the page has no playground", () => {
    const frontmatter: Record<string, unknown> = {};
    applyPlaygroundLayout(frontmatter, false);
    expect(frontmatter.aside).toBeUndefined();
  });

  it("respects explicit aside: true opt-out", () => {
    const frontmatter: Record<string, unknown> = { aside: true };
    applyPlaygroundLayout(frontmatter, true);
    expect(frontmatter.aside).toBe(true);
  });

  it("keeps an existing aside: false", () => {
    const frontmatter: Record<string, unknown> = { aside: false };
    applyPlaygroundLayout(frontmatter, true);
    expect(frontmatter.aside).toBe(false);
  });
});
