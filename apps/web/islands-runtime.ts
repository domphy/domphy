// DomphyPress island runtime (client). Hydrates the interactive widgets that the
// pipeline extracted as placeholders: the live code editors, the live previews,
// and the header search box. It reuses the EXISTING Domphy widgets — the editor
// and preview Containers and the search widget — rather than reimplementing them.
//
// This file is the esbuild entry's dependency. Each page emits a small inline
// script setting `window.__DP_PAGE_ISLANDS__` (the island specs for that page),
// then loads the bundled entry which calls `bootstrap(previewRegistry)`.

import { type DomphyElement, ElementNode } from "@domphy/core";
import { mountSearch } from "@domphy/press/browser";
import { themeApply } from "@domphy/theme";

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

/**
 * Renders any ```mermaid fenced code blocks on the page client-side using
 * IntersectionObserver so the ~2MB mermaid library is only loaded when a diagram
 * is actually scrolled into view (200px lookahead).
 */
async function renderMermaidBlocks(): Promise<void> {
  const blocks = Array.from(
    document.querySelectorAll<HTMLElement>(
      'pre > code.language-mermaid, code[data-language="mermaid"]',
    ),
  );
  if (blocks.length === 0) return;

  let mermaidLib: typeof import("mermaid")["default"] | null = null;
  let renderIndex = 0;
  const rendered = new WeakSet<HTMLElement>();

  const decode = (text: string): string =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");

  const renderBlock = async (code: HTMLElement) => {
    if (rendered.has(code)) return;
    rendered.add(code);
    if (!mermaidLib) {
      mermaidLib = (await import("mermaid")).default;
      const dark =
        document.documentElement.getAttribute("data-theme") === "dark";
      mermaidLib.initialize({
        startOnLoad: false,
        theme: dark ? "dark" : "default",
      });
    }
    const source = decode(code.textContent ?? "");
    const target = code.closest("pre") ?? code;
    try {
      const { svg } = await mermaidLib.render(
        `dp-mermaid-${renderIndex++}`,
        source,
      );
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid";
      wrapper.innerHTML = svg;
      target.replaceWith(wrapper);
    } catch (error) {
      console.error("mermaid render failed", error);
    }
  };

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
          mountEditor(host, spec.code, spec.storageKey);
        } else if (spec.kind === "preview" && spec.source) {
          const loader = previewRegistry[spec.source];
          if (loader) {
            loader().then((module) =>
              spec.bare
                ? mountBare(host, module.default)
                : mountPreview(host, module.default),
            );
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
