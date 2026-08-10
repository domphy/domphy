import { type PartialElement, sanitizeHTMLString } from "@domphy/core";
import type { MermaidOptions } from "./types.js";

declare const process: { env: Record<string, string | undefined> } | undefined;

// Dev-only warning guard, same pattern as @domphy/core's dev.ts — production
// bundlers fold this to `false` and tree-shake the guarded warning away.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production";

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

/**
 * Options for the client-side patch. Only `theme` and `mermaidConfig` from
 * `MermaidOptions` apply here — `background`/`css`/`puppeteer` are build-time-only
 * (they configure `@mermaid-js/mermaid-cli`'s headless page render, which the
 * browser `mermaid.render()` call has no equivalent for), so they are
 * intentionally omitted rather than silently ignored.
 */
export interface MermaidClientOptions
  extends Pick<MermaidOptions, "theme" | "mermaidConfig"> {
  /**
   * Override how the `mermaid` library is obtained. Defaults to a dynamic
   * `import("mermaid")`. Supply a resolver to use a globally loaded copy, e.g.
   * `() => (window as any).mermaid`.
   */
  loadMermaid?: MermaidLoader;
}

/** Monotonic id source so each rendered diagram gets a unique SVG id. */
let renderCounter = 0;

// mermaid.initialize() mutates the library's GLOBAL config — there is no
// per-render config parameter. Two clients mounting concurrently with
// different configs would interleave (initialize(A) → initialize(B) →
// render(A-with-B's-config)). Serializing every initialize+render pair
// through one shared queue keeps each mount's render glued to its own
// initialize. The queue is module-level (not per client instance) on
// purpose: the config lives on the shared mermaid module, so per-instance
// queues would still interleave across instances.
let renderQueue: Promise<unknown> = Promise.resolve();

function enqueueRender<T>(task: () => Promise<T>): Promise<T> {
  const result = renderQueue.then(task);
  // A failed render must not poison the queue for later diagrams.
  renderQueue = result.catch(() => {});
  return result;
}

// Strips <script> elements, `on*` event-handler attributes, and
// `javascript:` URLs from the rendered SVG before it is written via
// `innerHTML`. The build-time path (`renderMermaidInTree`) gets equivalent
// stripping for free from `@domphy/core`'s `TextNode` (which sanitizes
// inline HTML content on mount); this path writes to the DOM directly,
// bypassing that, so it applies core's shared `sanitizeHTMLString` itself.

// Builds the effective mermaid config for one mount: the caller's
// mermaidConfig on top of { startOnLoad: false, theme }, with securityLevel
// pinned to "strict" unless the caller explicitly chose one. The client
// path's XSS posture rests on mermaid's strict sanitization — nothing else
// sets it, and a silent mermaid default change (or an accidental "loose")
// must not loosen it unnoticed.
function resolveMermaidConfig(
  theme: string,
  mermaidConfig: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    startOnLoad: false,
    theme,
    ...(mermaidConfig ?? {}),
  };
  if (config.securityLevel === undefined) {
    config.securityLevel = "strict";
  } else if (
    __DEV__ &&
    (config.securityLevel === "loose" || config.securityLevel === "antiscript")
  ) {
    console.warn(
      `[mermaid] mermaidConfig.securityLevel: "${config.securityLevel}" disables mermaid's ` +
        `built-in HTML sanitization for diagram labels. Only use it with diagram ` +
        `sources you fully trust — prefer "strict" (the default) or "sandbox".`,
    );
  }
  return config;
}

/** Loads the `mermaid` browser library via dynamic import (the default path). */
async function importMermaid(): Promise<MermaidBrowserModule> {
  const imported = (await import("mermaid")) as unknown as {
    default?: MermaidBrowserModule;
  } & MermaidBrowserModule;
  const mermaid = imported.default ?? imported;
  if (!mermaid || typeof mermaid.render !== "function") {
    throw new Error(
      "[mermaid] the 'mermaid' library was not found. Install it to use " +
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
  // Tracks whether the node has been torn down. Rendering is asynchronous, so
  // the element may be removed before the render promise resolves; this guard
  // stops a late `.then` from writing into a node that no longer exists.
  let disposed = false;

  return {
    _onRemove: () => {
      disposed = true;
    },
    _onMount: (node) => {
      const host = node.domElement;
      if (!host) return;

      // Prefer an inner <code> if present (the `@domphy/press` markdown shape), else use
      // the host element's own text.
      const codeElement = host.querySelector("code");
      const target = codeElement ?? host;
      const source = (target.textContent ?? "").trim();
      if (!source) return;

      const load = options.loadMermaid ?? defaultLoader;
      const theme = options.theme ?? "default";
      const id = `domphy-mermaid-${++renderCounter}`;

      // Serialized: initialize() mutates global mermaid config, so the
      // initialize+render pair must not interleave with another mount's (see
      // enqueueRender above). The disposed check runs BEFORE the render starts
      // (queue drain), not only after it resolves: a node removed while
      // waiting in the queue must not run mermaid.render at all — the result
      // would be discarded anyway. The sentinel keeps the render-result shape
      // so the shared .then below just no-ops via its own disposed guard.
      type RenderResult = Awaited<ReturnType<MermaidBrowserModule["render"]>>;
      enqueueRender(
        (): Promise<RenderResult> =>
          disposed
            ? Promise.resolve({ svg: "" })
            : Promise.resolve(load()).then((mermaid) => {
                mermaid.initialize(
                  resolveMermaidConfig(theme, options.mermaidConfig),
                );
                return mermaid.render(id, source);
              }),
      )
        .then(({ svg, bindFunctions }) => {
          // The node may have been removed while the render was in flight; do
          // not write into a torn-down element.
          if (disposed) return;
          // Replace the source code block with the rendered SVG, mirroring the
          // build-time wrapper so styling is consistent across paths.
          host.innerHTML = sanitizeHTMLString(svg);
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
            `[mermaid] client render failed.\n${message}\n--- source ---\n${source}`,
          );
        });
    },
  };
}

/**
 * Domphy patch that renders a Mermaid diagram in the browser at mount time.
 * Apply it via `$` to a `pre`/`code` element whose text content is Mermaid
 * source (e.g. the block produced by `@domphy/press`). On mount it reads the
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
