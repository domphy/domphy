// Shared page-discovery / island-emit helpers used by build.press.ts.
// Kept out of the build script so unit tests do not import the SSG pipeline.

import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PageIslandSpec } from "./html-template.js";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "../..");

/** Visual QA catalogs and findings markdown are not public doc routes. */
export function isShippablePage(filePath: string): boolean {
  const posix = filePath.replace(/\\/g, "/");
  if (/(^|\/)visual\//i.test(posix)) return false;
  if (/findings\.md$/i.test(posix)) return false;
  return true;
}

/** Registry / HTML key: repo-relative posix, never a build-machine absolute. */
export function toIslandSourceKey(absPath: string): string {
  return relative(repoRoot, absPath).replace(/\\/g, "/");
}

export function parsePressArgs(argv: string[]): {
  watch: boolean;
  port: number;
} {
  const watchMode = argv.includes("--watch");
  const portFlag = argv.indexOf("--port");
  const parsed = portFlag >= 0 ? Number(argv[portFlag + 1]) : Number.NaN;
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
  return { watch: watchMode, port };
}

export function pageIslandSpecs(page: {
  islands: Array<{
    kind: string;
    id: string;
    source?: string;
    inlineCode?: string;
    storageKey?: string;
    bare?: boolean;
  }>;
}): PageIslandSpec[] {
  const specs: PageIslandSpec[] = [{ kind: "search", id: "search" }];
  for (const island of page.islands) {
    if (island.kind === "editor") {
      let code = island.inlineCode;
      if (!code && island.source) {
        code = existsSync(island.source)
          ? readFileSync(island.source, "utf8")
          : "// demo source not found";
      }
      code ??= "// demo source not found";
      const spec: PageIslandSpec = { kind: "editor", id: island.id, code };
      if (island.storageKey) spec.storageKey = island.storageKey;
      specs.push(spec);
    } else if (island.kind === "preview" && island.source) {
      const spec: PageIslandSpec = {
        kind: "preview",
        id: island.id,
        source: toIslandSourceKey(island.source),
      };
      if (island.bare) spec.bare = true;
      specs.push(spec);
    }
  }
  return specs;
}
