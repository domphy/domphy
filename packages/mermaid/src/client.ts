import type { PartialElement } from "@domphy/core";
import type { MermaidOptions } from "./types.js";

/** Minimal structural type for the parts of the `mermaid` browser lib we use. */
export interface MermaidBrowserModule {
  initialize(config: Record<string, unknown>): void;
  render(
    id: string,
    text: string,
    container?: Element,
  ): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

/** Resolves the `mermaid` browser library (sync or async). */
export type MermaidLoader = () =>
  | MermaidBrowserModule
  | Promise<MermaidBrowserModule>;

/** Options for the client-side patch. */
export interface MermaidClientOptions extends MermaidOptions {
  /**
   * Override how the `mermaid` library is obtained. Defaults to a dynamic
   * `import("mermaid")`. Supply a resolver to use a globally loaded copy, e.g.
   * `() => (window as any).mermaid`.
   */
  loadMermaid?: MermaidLoader;
}

/** Monotonic id source so each rendered diagram gets a unique SVG id. */
let renderCounter = 0;

/** Loads the `mermaid` browser library via dynamic import (the default path). */
async function importMermaid(): Promise<MermaidBrowserModule> {
  const imported = (await import("mermaid")) as unknown as {
    default?: MermaidBrowserModule;
  } & MermaidBrowserModule;
  const mermaid = imported.default ?? imported;
  if (!mermaid || typeof mermaid.render !== "function") {
    throw new Error(
      "@domphy/mermaid: the 'mermaid' library was not found. Install it to use " +
        "client-side rendering (it is an optional peer dependency).",
    );
  }
  return mermaid;
}

/**
 * Core of the client patch, parameterized by the default loader. Exported so the
 * browser/IIFE build can supply a global-scope loader instead of a dynamic
 * `import("mermaid")` (which cannot be kept external in an IIFE bundle).
 */
export function makeMermaidClient(
  defaultLoader: MermaidLoader,
  options: MermaidClientOptions,
): PartialElement {
  return {
    _onMount: (node) => {
      const host = node.domElement;
      if (!host) return;

      // Prefer an inner <code> if present (the @domphy/markdown shape), else use
      // the host element's own text.
      const codeElement = host.querySelector("code");
      const target = codeElement ?? host;
      const source = (target.textContent ?? "").trim();
      if (!source) return;

      const load = options.loadMermaid ?? defaultLoader;
      const theme = options.theme ?? "default";
      const id = `domphy-mermaid-${++renderCounter}`;

      Promise.resolve(load())
        .then((mermaid) => {
          mermaid.initialize({
            startOnLoad: false,
            theme,
            ...(options.mermaidConfig ?? {}),
          });
          return mermaid.render(id, source);
        })
        .then(({ svg, bindFunctions }) => {
          // Replace the source code block with the rendered SVG, mirroring the
          // build-time wrapper so styling is consistent across paths.
          host.innerHTML = svg;
          host.classList.add("mermaid");
          if (!host.getAttribute("aria-label")) {
            host.setAttribute("aria-label", "diagram");
          }
          if (bindFunctions) bindFunctions(host);
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          // Surface the failure in the console; do not throw from a lifecycle
          // hook (that would break the surrounding mount).
          console.error(
            `@domphy/mermaid: client render failed.\n${message}\n--- source ---\n${source}`,
          );
        });
    },
  };
}

/**
 * Domphy patch that renders a Mermaid diagram in the browser at mount time.
 * Apply it via `$` to a `pre`/`code` element whose text content is Mermaid
 * source (e.g. the block produced by `@domphy/markdown`). On mount it reads the
 * source from the element, renders it with the `mermaid` library, and replaces
 * the element's content with the resulting SVG.
 *
 * The `mermaid` library is an optional peer dependency: only this client path
 * needs it, so build-time consumers are not forced to install it. By default it
 * is loaded with a dynamic `import("mermaid")`; override with
 * `options.loadMermaid` (e.g. to use a global `window.mermaid`).
 *
 * ```ts
 * const App = {
 *   pre: [{ code: "graph TD; A-->B;" }],
 *   $: [mermaidClient({ theme: "dark" })],
 * }
 * ```
 */
export function mermaidClient(
  options: MermaidClientOptions = {},
): PartialElement {
  return makeMermaidClient(importMermaid, options);
}
