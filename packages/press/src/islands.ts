// Islands client runtime (browser). Hydrates the search widget.
// Bundled by esbuild during `domphy-press build` into assets/press-islands.js.

import { themeApply } from "@domphy/theme";
import { mountSearch, type SearchWidgetOptions } from "./search.js";

export interface IslandSpec {
  kind: "search";
  id: string;
  searchOptions?: SearchWidgetOptions;
}

export type IslandRegistry = Record<string, IslandSpec>;

function run(registry: IslandRegistry): void {
  themeApply();
  const specs = Object.values(registry);
  for (const spec of specs) {
    const host = document.querySelector<HTMLElement>(
      `[data-island="${spec.id}"]`,
    );
    if (!host) continue;
    if (spec.kind === "search") {
      mountSearch(host, spec.searchOptions);
    }
  }
}

export function bootstrap(registry: IslandRegistry): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => run(registry), {
      once: true,
    });
  } else {
    run(registry);
  }
}
