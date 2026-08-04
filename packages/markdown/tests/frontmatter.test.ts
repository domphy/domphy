import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "../src/index";

describe("splitFrontmatter", () => {
  it("accepts `...` as the closing document-end marker", () => {
    const { frontmatter, content } = splitFrontmatter(
      "---\ntitle: X\n...\nBody here",
    );
    expect(frontmatter).toEqual({ title: "X" });
    expect(content).toBe("Body here");
  });

  it("handles a CRLF document", () => {
    const { frontmatter, content } = splitFrontmatter(
      "---\r\ntitle: Y\r\n---\r\nBody",
    );
    expect(frontmatter).toEqual({ title: "Y" });
    expect(content).toBe("Body");
  });

  it("returns an empty object and still strips the block on invalid YAML", () => {
    // `title: : : bad` is not parseable YAML, so the parser throws; the block is
    // stripped but no frontmatter values are exposed.
    const { frontmatter, content } = splitFrontmatter(
      "---\ntitle: : : bad\n  - x\n---\nBody",
    );
    expect(frontmatter).toEqual({});
    expect(content).toBe("Body");
  });

  it("ignores a non-mapping top-level list", () => {
    const { frontmatter, content } = splitFrontmatter(
      "---\n- a\n- b\n---\nBody",
    );
    expect(frontmatter).toEqual({});
    expect(content).toBe("Body");
  });

  it("ignores a non-mapping top-level scalar", () => {
    const { frontmatter, content } = splitFrontmatter("---\nhello\n---\nBody");
    expect(frontmatter).toEqual({});
    expect(content).toBe("Body");
  });

  it("does not consume a leading `---` thematic rule as frontmatter", () => {
    // A leading `---` with no matching closing fence is a thematic break, not a
    // frontmatter block. The `---` must remain in the content for the body
    // parser to turn it into an <hr>.
    const source = "---\n\nJust content after a rule";
    const { frontmatter, content } = splitFrontmatter(source);
    expect(frontmatter).toEqual({});
    expect(content).toBe(source);
  });

  it("accepts a UTF-8 BOM before the opening fence", () => {
    // Windows-authored files often carry a BOM; gray-matter strips it, and so
    // should we — otherwise the whole block degrades into an <hr> plus YAML
    // text in the rendered body.
    const { frontmatter, content } = splitFrontmatter(
      "\uFEFF---\ntitle: Z\n---\nBody",
    );
    expect(frontmatter).toEqual({ title: "Z" });
    expect(content).toBe("Body");
  });

  it("returns the document unchanged when there is no frontmatter", () => {
    const { frontmatter, content } = splitFrontmatter("# Heading\n\nBody");
    expect(frontmatter).toEqual({});
    expect(content).toBe("# Heading\n\nBody");
  });
});
