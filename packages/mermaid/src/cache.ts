import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderMermaidToSvg, normalizeMermaidSource } from "./renderer.js";
import type { CacheOptions, MermaidOptions, MermaidRenderer } from "./types.js";

/** Default cache directory, relative to the current working directory. */
export const DEFAULT_CACHE_DIR = join(
  "node_modules",
  ".cache",
  "domphy-mermaid",
);

/**
 * The subset of options that change the rendered output. Only these are folded
 * into the cache key, so unrelated options (e.g. `cacheDir`) do not invalidate
 * the cache.
 */
function renderKeyParts(options: MermaidOptions): unknown {
  return {
    theme: options.theme ?? "default",
    background: options.background ?? "transparent",
    mermaidConfig: options.mermaidConfig ?? null,
    css: options.css ?? null,
  };
}

/**
 * Computes a stable cache key for a diagram. Uses SHA-256 over the normalized
 * source and the output-affecting options. The key is deterministic: it never
 * incorporates time or randomness, so repeated builds of identical input hit the
 * cache.
 */
export function cacheKey(code: string, options: MermaidOptions = {}): string {
  const source = normalizeMermaidSource(code);
  const payload = JSON.stringify({ source, options: renderKeyParts(options) });
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Renders a Mermaid diagram with an on-disk cache. The first render writes the
 * SVG to `cacheDir`; later calls with the same source and output options read it
 * back without launching a browser.
 *
 * A custom `renderer` may be supplied (defaults to `renderMermaidToSvg`); this
 * keeps the cache logic testable without a headless browser.
 */
export async function renderMermaidCached(
  code: string,
  options: CacheOptions = {},
  renderer: MermaidRenderer = renderMermaidToSvg,
): Promise<string> {
  const useCache = options.cache !== false;
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const key = cacheKey(code, options);
  const cacheFile = join(cacheDir, `${key}.svg`);

  if (useCache) {
    try {
      return await readFile(cacheFile, "utf8");
    } catch {
      // Cache miss (file absent or unreadable): fall through to render.
    }
  }

  const svg = await renderer(code, options);

  if (useCache) {
    try {
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cacheFile, svg, "utf8");
    } catch {
      // A failed cache write must not fail the build; the SVG is still returned.
    }
  }

  return svg;
}
