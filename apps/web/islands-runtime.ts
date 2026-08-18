// DomphyPress island runtime (client). Hydrates the interactive widgets that the
// pipeline extracted as placeholders: the live code editors, the live previews,
// and the header search box. It reuses the EXISTING Domphy widgets — the editor
// and preview Containers and the search widget — rather than reimplementing them.
//
// This file is the esbuild entry's dependency. Each page emits a small inline
// script setting `window.__DP_PAGE_ISLANDS__` (the island specs for that page),
// then loads the bundled entry which calls `bootstrap(previewRegistry)`.

import {
  type DomphyElement,
  ElementNode,
  sanitizeHTMLString,
} from "@domphy/core";
import { mountSearch } from "@domphy/press/browser";
import { themeApply } from "@domphy/theme";
// Side effect: registers the site's brand palette into the client theme
// registry, so the themeApply() calls below re-inject the SAME themeCSS()
// the SSG build baked into the page (see site-theme.ts for why both need it).
import "./site-theme.js";

// The editor and preview Containers are dynamically imported so a page with only
// the (lightweight) search island does not pull the CodeMirror/transform editor
// runtime — esbuild splits each into its own on-demand chunk.

export interface IslandSpec {
  kind: "search" | "preview" | "editor";
  /** Matches the placeholder `data-island` attribute in the SSR HTML. */
  id: string;
  /** For "preview": registry key (the demo module path). */
  source?: string;
  /** For "editor": the demo's raw source text. */
  code?: string;
  /** For "editor": optional localStorage key to persist edits. */
  storageKey?: string;
  /** For "preview": mount the element directly (no toolbar/box chrome). */
  bare?: boolean;
}

/**
 * Mounts an element as-is into the host — no toolbar, no shadow root, no
 * preview box. The element inherits the page's live theme context, so
 * theme-token colors inside it follow the site theme toggle. Used for
 * full-width compositions like the landing hero.
 */
function mountBare(host: HTMLElement, element: DomphyElement): void {
  themeApply();
  new ElementNode(element).render(host);
}

/** Mounts a live preview (Toolbar + shadow-DOM rendered demo) into a host. */
async function mountPreview(
  host: HTMLElement,
  element: DomphyElement,
): Promise<void> {
  const { Container } = await import("./docs/preview/Container.js");
  themeApply();
  new ElementNode(Container(element)).render(host);
}

/** Mounts a live code editor (CodeMirror + transform + shadow preview). */
async function mountEditor(
  host: HTMLElement,
  code: string,
  storageKey?: string,
): Promise<void> {
  const { Container: EditorContainer } = await import(
    "./docs/editor/Container.js"
  );
  themeApply();
  const shadowHost = document.createElement("div");
  // No overflow here — Render.ts's own wrapper div (rendered inside
  // previewContainer below) already scrolls its content at height:100%.
  // Adding a second overflow:auto here nested it inside the first, producing
  // two redundant scrollbars right next to each other.
  shadowHost.style.cssText =
    "flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden;";
  const shadow = shadowHost.attachShadow({ mode: "open" });
  const themeTag = document.createElement("style");
  themeTag.id = "domphy-themes";
  const previewContainer = document.createElement("div");
  previewContainer.style.flex = "1";
  previewContainer.style.minHeight = "0";
  shadow.append(themeTag, previewContainer);
  themeApply(themeTag);
  new ElementNode(
    EditorContainer(code, shadowHost, previewContainer, storageKey),
  ).render(host);
}

/** Map of demo module path -> dynamic importer, generated at build time. */
export type PreviewRegistry = Record<
  string,
  () => Promise<{ default: DomphyElement }>
>;

/** Minimal structural type for the parts of the `mermaid` browser lib used. */
export interface MermaidBrowserModule {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ svg: string }>;
}

/**
 * Renders any ```mermaid fenced code blocks on the page client-side using
 * IntersectionObserver so the ~2MB mermaid library is only loaded when a diagram
 * is actually scrolled into view (200px lookahead).
 *
 * Hardened to match the internal mermaid module's client patch
 * (apps/web/mermaid/client.ts): `securityLevel` is
 * pinned to "strict" at every initialize, the rendered SVG is sanitized with
 * core's `sanitizeHTMLString` before the `innerHTML` write, and rendered
 * diagrams re-render when `[data-theme]` flips. `loadMermaid` is injectable
 * for tests.
 */
/** Press emits mermaid as `div.dp-mermaid.language-mermaid`; keep the older `pre>code` forms too. */
export const MERMAID_BLOCK_SELECTOR = [
  "pre > code.language-mermaid",
  'code[data-language="mermaid"]',
  ".dp-mermaid",
  "div.language-mermaid",
].join(", ");

export async function renderMermaidBlocks(
  loadMermaid: () => Promise<MermaidBrowserModule> = async () =>
    (await import("mermaid")).default,
): Promise<void> {
  const blocks = Array.from(
    document.querySelectorAll<HTMLElement>(MERMAID_BLOCK_SELECTOR),
  );
  if (blocks.length === 0) return;

  let mermaidLib: MermaidBrowserModule | null = null;
  let renderIndex = 0;
  const rendered = new WeakSet<HTMLElement>();
  // Diagrams already swapped in, kept so a [data-theme] flip can re-render
  // them with the new theme.
  const renderedBlocks: { el: HTMLElement; source: string }[] = [];

  // mermaid.initialize() mutates the library's GLOBAL config, so every
  // initialize+render pair is serialized through this queue — a theme-flip
  // re-render must not interleave with an in-flight first render.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };

  const currentTheme = () =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "default";

  const decode = (text: string): string =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");

  const renderSource = async (source: string): Promise<string> => {
    if (!mermaidLib) mermaidLib = await loadMermaid();
    // Pin strict: diagram source is author-supplied text and the rendered SVG
    // is written via innerHTML, so mermaid's built-in label sanitization must
    // not rest on the library default never changing.
    mermaidLib.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: currentTheme(),
    });
    const { svg } = await mermaidLib.render(
      `dp-mermaid-${renderIndex++}`,
      source,
    );
    return sanitizeHTMLString(svg);
  };

  const renderBlock = (code: HTMLElement) =>
    enqueue(async () => {
      if (rendered.has(code)) return;
      rendered.add(code);
      const source = decode(code.textContent ?? "");
      const target = code.closest("pre") ?? code;
      const svg = await renderSource(source);
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid";
      wrapper.innerHTML = svg;
      target.replaceWith(wrapper);
      renderedBlocks.push({ el: wrapper, source });
    }).catch((error) => {
      console.error("mermaid render failed", error);
    });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void renderBlock(entry.target as HTMLElement);
      }
    },
    { rootMargin: "200px 0px" },
  );

  for (const block of blocks) observer.observe(block);

  // Follow [data-theme] flips: re-render already-rendered diagrams with the
  // new theme.
  new MutationObserver(() => {
    if (!mermaidLib || renderedBlocks.length === 0) return;
    for (const block of renderedBlocks) {
      void enqueue(async () => {
        block.el.innerHTML = await renderSource(block.source);
      }).catch((error) => {
        console.error("mermaid render failed", error);
      });
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

/** Reads the page's island specs and hydrates each placeholder. */
export function bootstrap(previewRegistry: PreviewRegistry): void {
  const run = () => {
    void renderMermaidBlocks();
    const specs: IslandSpec[] =
      (window as unknown as { __DP_PAGE_ISLANDS__?: IslandSpec[] })
        .__DP_PAGE_ISLANDS__ ?? [];
    for (const spec of specs) {
      const host = document.querySelector<HTMLElement>(
        `[data-island="${spec.id}"]`,
      );
      if (!host) continue;
      try {
        if (spec.kind === "search") {
          mountSearch(host);
        } else if (spec.kind === "editor" && spec.code != null) {
          void mountEditor(host, spec.code, spec.storageKey).catch(
            (mountError) => {
              console.error(
                `Island ${spec.id} (${spec.kind}) failed to mount`,
                mountError,
              );
            },
          );
        } else if (spec.kind === "preview" && spec.source) {
          const loader = previewRegistry[spec.source];
          if (loader) {
            void loader()
              .then((module) =>
                spec.bare
                  ? mountBare(host, module.default)
                  : mountPreview(host, module.default),
              )
              .catch((mountError) => {
                console.error(
                  `Island ${spec.id} (${spec.kind}) failed to mount`,
                  mountError,
                );
              });
          }
        }
      } catch (error) {
        console.error(
          `Island ${spec.id} (${spec.kind}) failed to mount`,
          error,
        );
      }
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
