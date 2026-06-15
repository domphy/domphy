import { parse as parseYaml } from "yaml";

export interface FrontmatterSplit {
  /** Parsed YAML frontmatter, or an empty object when none is present. */
  frontmatter: Record<string, unknown>;
  /** The markdown content with the frontmatter block removed. */
  content: string;
}

// A frontmatter block is a fenced YAML region delimited by `---` lines at the
// very top of the document. The opening fence must be the first line; the
// closing fence is the next line that is exactly `---` (allowing trailing
// whitespace). `...` is also accepted as a YAML document end marker.
const FRONTMATTER_PATTERN =
  /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

/**
 * Splits an optional leading YAML frontmatter block from a markdown string.
 * When the frontmatter cannot be parsed as a YAML mapping, the block is still
 * stripped from the content but the frontmatter is returned as an empty object.
 */
export function splitFrontmatter(markdown: string): FrontmatterSplit {
  const match = FRONTMATTER_PATTERN.exec(markdown);
  if (!match) {
    return { frontmatter: {}, content: markdown };
  }

  const content = markdown.slice(match[0].length);
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(match[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid YAML: keep the block stripped but expose no frontmatter values
    // rather than throwing, so a malformed header never breaks the body parse.
    frontmatter = {};
  }

  return { frontmatter, content };
}
