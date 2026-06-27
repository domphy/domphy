/** Built-in Mermaid color themes. */
export type MermaidTheme = "default" | "dark" | "neutral" | "forest" | "base";

/**
 * Options for the build-time renderer. These map onto the headless Mermaid
 * render performed by `@mermaid-js/mermaid-cli`.
 */
export interface MermaidOptions {
  /**
   * Color theme passed to Mermaid. Defaults to `"default"`.
   */
  theme?: MermaidTheme;
  /**
   * SVG background color. Use `"transparent"` for no background. Defaults to
   * `"transparent"` so diagrams blend with the surrounding page.
   */
  background?: string;
  /**
   * Extra Mermaid configuration merged on top of `{ theme }`. Anything accepted
   * by `mermaid.initialize` is valid here.
   */
  mermaidConfig?: Record<string, unknown>;
  /**
   * Optional CSS injected into the rendering page, forwarded to Mermaid as
   * `myCSS`.
   */
  css?: string;
  /**
   * Puppeteer launch options forwarded to `@mermaid-js/mermaid-cli` as
   * `puppeteerConfig`. Use this to point at a specific Chrome executable
   * (`executablePath`) or pass sandbox flags (`args`).
   */
  puppeteer?: Record<string, unknown>;
}

/**
 * Options for the on-disk render cache. Caching is keyed by a stable hash of the
 * diagram source plus the render options, so repeated builds reuse the SVG.
 */
export interface CacheOptions extends MermaidOptions {
  /**
   * Directory the cache writes SVG files into. Defaults to
   * `node_modules/.cache/domphy-mermaid` relative to the current working
   * directory.
   */
  cacheDir?: string;
  /**
   * Set to `false` to bypass the cache entirely (always render). Defaults to
   * `true`.
   */
  cache?: boolean;
}

/**
 * Signature for a function that turns Mermaid source into an inline SVG string.
 * `renderMermaidToSvg` matches this shape; the tree integration accepts a custom
 * one so it can be tested without launching a browser.
 */
export type MermaidRenderer = (
  code: string,
  options?: MermaidOptions,
) => Promise<string>;

/** Options for the markdown tree integration. */
export interface TreeOptions extends CacheOptions {
  /**
   * Renderer used to turn Mermaid source into SVG. Defaults to the cached
   * build-time renderer (`renderMermaidCached`). Inject a custom renderer to
   * test the tree walk without a headless browser.
   */
  renderer?: MermaidRenderer;
  /**
   * CSS class set on the wrapping element. Defaults to `"mermaid"`.
   */
  className?: string;
  /**
   * Accessible label set as `ariaLabel` on the wrapping element. Defaults to
   * `"diagram"`.
   */
  ariaLabel?: string;
}
