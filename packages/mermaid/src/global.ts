// Browser IIFE entry. Only the client-side patch is browser-safe (the
// build-time renderer/cache/tree integration depend on Node and a headless
// browser), so the global bundle exposes just that path.
//
// In a script-tag deployment the host page loads `mermaid` separately (e.g. via
// its own CDN script), so the default loader here reads it from the global scope
// rather than performing a dynamic `import("mermaid")`. An IIFE bundle cannot
// keep a dynamic import external, so importing it would inline the whole library;
// reading the global avoids that and keeps this bundle tiny.
import type { PartialElement } from "@domphy/core";
import {
  type MermaidBrowserModule,
  type MermaidClientOptions,
  makeMermaidClient,
} from "./client.js";

/** Reads a globally loaded `mermaid` (e.g. from a CDN <script>). */
function globalMermaid(): MermaidBrowserModule {
  const candidate = (globalThis as { mermaid?: MermaidBrowserModule }).mermaid;
  if (!candidate || typeof candidate.render !== "function") {
    throw new Error(
      "@domphy/mermaid: no global `mermaid` found. Load the mermaid library " +
        "(e.g. via a <script> tag) before using the client patch from the " +
        "browser global build, or pass `loadMermaid` in the options.",
    );
  }
  return candidate;
}

/** Client patch for the browser global build; resolves mermaid from the page. */
export function mermaidClient(
  options: MermaidClientOptions = {},
): PartialElement {
  return makeMermaidClient(globalMermaid, options);
}

export type { MermaidClientOptions } from "./client.js";
export type { MermaidOptions, MermaidTheme } from "./types.js";
