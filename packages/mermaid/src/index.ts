// @domphy/mermaid — render Mermaid diagrams for Domphy.
//
// Two paths:
//  - Build-time / SSG: `renderMermaidToSvg` (headless render via
//    `@mermaid-js/mermaid-cli`), `renderMermaidCached` (on-disk cache), and
//    `renderMermaidInTree` (markdown tree integration for `@domphy/markdown`).
//  - Client-side: the `mermaidClient` patch renders in the browser via the
//    optional `mermaid` peer dependency.

export { cacheKey, DEFAULT_CACHE_DIR, renderMermaidCached } from "./cache.js";
export type {
  MermaidBrowserModule,
  MermaidClientOptions,
  MermaidLoader,
} from "./client.js";
export { mermaidClient } from "./client.js";
export { normalizeMermaidSource, renderMermaidToSvg } from "./renderer.js";
export { renderMermaidInTree } from "./tree.js";
export type {
  CacheOptions,
  MermaidOptions,
  MermaidRenderer,
  MermaidTheme,
  TreeOptions,
} from "./types.js";
