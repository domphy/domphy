// Node-only wrapper around the browser-safe markdown core: resolves the
// optional `remark-math` peer for `createMarkdown({ math: true })`.
//
// This lives outside src/markdown/ on purpose. Everything under src/markdown/
// is bundled into browser builds (apps/web's editor playground imports it),
// and esbuild rejects node builtins for the browser platform — so the Node
// resolution must sit in a module only the Node entry (src/index.ts) pulls in.
//
// Pure-ESM Node has no `require`; a bare `require("remark-math")` goes through
// tsup's ESM require shim and throws "Dynamic require of … is not supported",
// masking the honest install hint. createRequire(import.meta.url) anchors a
// real require instead.

import { createRequire } from "node:module";
import { createMarkdown as createMarkdownCore } from "./markdown/index.js";
import type {
  CreateMarkdownOptions,
  MarkdownInstance,
  RemarkPlugin,
} from "./markdown/types.js";

/**
 * Creates a reusable markdown parser. Identical to the `@domphy/press/browser`
 * export except that `math: true` loads the optional `remark-math` peer.
 *
 * @example
 * ```ts
 * import { createMarkdown } from "@domphy/press"
 * const parser = createMarkdown({ highlight: (code, info) => myHighlighter(code, info) })
 * const { frontmatter, body, toc } = parser.parse(source)
 * ```
 */
export function createMarkdown(
  options: CreateMarkdownOptions = {},
): MarkdownInstance {
  if (!options.math) return createMarkdownCore(options);

  let mathPlugin: RemarkPlugin;
  try {
    // Declared in package.json peerDependencies (peerDependenciesMeta.optional)
    // so a consumer's package manager surfaces the missing-peer warning; the
    // runtime require + honest error below is what fires when they ignore it.
    const loaded = createRequire(import.meta.url)("remark-math") as {
      default?: RemarkPlugin;
    } & RemarkPlugin;
    mathPlugin = (loaded.default ?? loaded) as RemarkPlugin;
  } catch {
    throw new Error(
      "[@domphy/press] math:true requires remark-math. Run: pnpm add remark-math",
    );
  }

  return createMarkdownCore({
    ...options,
    math: false,
    plugins: [mathPlugin, ...(options.plugins ?? [])],
  });
}
