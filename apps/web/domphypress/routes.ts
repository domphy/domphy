// DomphyPress route discovery: walks the markdown tree and maps every page to a
// clean URL + output path, and resolves the sidebar group / prev-next links for
// a given route from the site config. Pure (no rendering) so it is unit-testable.

import { readdirSync, statSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import type { SidebarItem, SiteConfig } from "./types.js";
import type { PageEntry } from "./types.js";

// Directories under the docs tree that hold include-only partials or demo/island
// sources, not standalone pages.
const NON_PAGE_DIRS = new Set(["snippets", "demos", "editor", "preview"]);

/** Converts an app-relative markdown path to a clean route. */
export function routeForFile(appRelativePath: string): string {
  // Normalize to posix and drop the ".md" extension.
  const posixPath = appRelativePath.split(sep).join(posix.sep);
  const withoutExt = posixPath.replace(/\.md$/, "");
  const segments = withoutExt.split("/");
  const last = segments[segments.length - 1];

  if (last === "index") {
    segments.pop();
    // Root index.md -> "/", else "/a/b/".
    return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
  }
  return `/${segments.join("/")}`;
}

/** Output file (clean URLs): every route maps to a directory index.html. */
export function outFileForRoute(route: string): string {
  if (route === "/") return "index.html";
  const trimmed = route.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${trimmed}/index.html`;
}

/** Recursively lists markdown files under a directory, skipping non-page dirs. */
function listMarkdown(dir: string, appRoot: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (NON_PAGE_DIRS.has(name) || name.startsWith(".")) continue;
      found.push(...listMarkdown(full, appRoot));
    } else if (name.endsWith(".md") && name.toLowerCase() !== "readme.md") {
      found.push(full);
    }
  }
  return found;
}

/**
 * Discovers every page: the app-root landing (`index.md`) plus all markdown
 * under `docs/`, excluding include/demo directories. Returns entries sorted by
 * route for deterministic output.
 */
export function discoverPages(appRoot: string): PageEntry[] {
  const files: string[] = [];

  // Root-level landing page(s), e.g. apps/web/index.md.
  for (const name of readdirSync(appRoot)) {
    if (name.endsWith(".md") && name.toLowerCase() !== "readme.md") {
      files.push(join(appRoot, name));
    }
  }
  // The docs tree.
  const docsDir = join(appRoot, "docs");
  files.push(...listMarkdown(docsDir, appRoot));

  const pages = files.map((filePath): PageEntry => {
    const appRelativePath = relative(appRoot, filePath);
    const route = routeForFile(appRelativePath);
    return { route, outFile: outFileForRoute(route), filePath };
  });

  pages.sort((a, b) => a.route.localeCompare(b.route));
  return pages;
}

/** Flattens a sidebar group tree into ordered leaf links (for prev/next). */
export function flattenSidebar(items: SidebarItem[]): { text: string; link: string }[] {
  const out: { text: string; link: string }[] = [];
  for (const item of items) {
    if (item.link) out.push({ text: item.text, link: item.link });
    if (item.items) out.push(...flattenSidebar(item.items));
  }
  return out;
}

/** Returns the sidebar config whose prefix best matches the route (longest wins). */
export function sidebarForRoute(
  route: string,
  config: SiteConfig,
): SidebarItem[] {
  let bestPrefix = "";
  for (const prefix of Object.keys(config.sidebar)) {
    if (route.startsWith(prefix) && prefix.length > bestPrefix.length) {
      bestPrefix = prefix;
    }
  }
  return bestPrefix ? config.sidebar[bestPrefix] : [];
}

/** Normalizes a sidebar/nav link to a comparable route (trailing-slash aware). */
function normalizeLink(link: string): string {
  return link;
}

/** Resolves previous/next page links within the active sidebar group. */
export function prevNextForRoute(
  route: string,
  config: SiteConfig,
): { prev?: { text: string; link: string }; next?: { text: string; link: string } } {
  const flat = flattenSidebar(sidebarForRoute(route, config)).map((item) => ({
    ...item,
    link: normalizeLink(item.link),
  }));
  // Match by route, tolerating a trailing slash difference.
  const index = flat.findIndex(
    (item) =>
      item.link === route ||
      item.link === route.replace(/\/$/, "") ||
      `${item.link}/` === route,
  );
  if (index === -1) return {};
  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  };
}
