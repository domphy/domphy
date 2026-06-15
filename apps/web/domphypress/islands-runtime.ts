// DomphyPress island runtime (client). Hydrates the interactive widgets that the
// pipeline extracted as placeholders: the live code editors, the live previews,
// and the header search box. It reuses the EXISTING Domphy widgets — the editor
// and preview Containers and the search widget — rather than reimplementing them.
//
// This file is the esbuild entry's dependency. Each page emits a small inline
// script setting `window.__DP_PAGE_ISLANDS__` (the island specs for that page),
// then loads the bundled entry which calls `bootstrap(previewRegistry)`.

import { type DomphyElement, ElementNode } from "@domphy/core";
import { themeApply } from "@domphy/theme";
import { mountSearch } from "./search.js";

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
}

/** Mounts a live preview (Toolbar + shadow-DOM rendered demo) into a host. */
async function mountPreview(host: HTMLElement, element: DomphyElement): Promise<void> {
  const { Container } = await import("../docs/preview/Container.js");
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
    "../docs/editor/Container.js"
  );
  themeApply();
  const shadowHost = document.createElement("div");
  shadowHost.style.cssText =
    "flex: 1; display: flex; flex-direction: column; overflow: auto;";
  const shadow = shadowHost.attachShadow({ mode: "open" });
  const themeTag = document.createElement("style");
  themeTag.id = "domphy-themes";
  const previewContainer = document.createElement("div");
  previewContainer.style.flex = "1";
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

/** Reads the page's island specs and hydrates each placeholder. */
export function bootstrap(previewRegistry: PreviewRegistry): void {
  const run = () => {
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
            loader().then((module) => mountPreview(host, module.default));
          }
        }
      } catch (error) {
        console.error(`Island ${spec.id} (${spec.kind}) failed to mount`, error);
      }
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
