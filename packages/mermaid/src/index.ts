// @domphy/mermaid — render Mermaid diagrams for Domphy.
//
// Two paths:
//  - Build-time / SSG: `renderMermaidToSvg` (headless render via
//    `@mermaid-js/mermaid-cli`), `renderMermaidCached` (on-disk cache), and
//    `renderMermaidInTree` (markdown tree integration for `@domphy/markdown`).
//  - Client-side: the `mermaidClient` patch renders in the browser via the
//    optional `mermaid` peer dependency.

export { renderMermaidToSvg, normalizeMermaidSource } from "./renderer.js";
export { renderMermaidCached, cacheKey, DEFAULT_CACHE_DIR } from "./cache.js";
export { renderMermaidInTree } from "./tree.js";
export { mermaidClient } from "./client.js";
export type {
  MermaidClientOptions,
  MermaidLoader,
  MermaidBrowserModule,
} from "./client.js";
export type {
  MermaidTheme,
  MermaidOptions,
  CacheOptions,
  TreeOptions,
  MermaidRenderer,
} from "./types.js";
