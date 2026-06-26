import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { PageEntry } from "./types.js";

export {
  flattenSidebar,
  prevNextForRoute,
  sidebarForRoute,
} from "./routes-browser.js";

function listMarkdown(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      const NON_PAGE_DIRS = new Set([
        "snippets",
        "demos",
        "node_modules",
        ".git",
      ]);
      if (NON_PAGE_DIRS.has(name) || name.startsWith(".")) continue;
      found.push(...listMarkdown(full));
    } else if (name.endsWith(".md") && name.toLowerCase() !== "readme.md") {
      found.push(full);
    }
  }
  return found;
}

export function routeForFile(srcRelativePath: string): string {
  const posixPath = srcRelativePath.replace(/\\/g, "/");
  const withoutExt = posixPath.replace(/\.md$/, "");
  const segments = withoutExt.split("/");
  const last = segments[segments.length - 1];
  if (last === "index") {
    segments.pop();
    return segments.length === 0 ? "/" : `/${segments.join("/")}/`;
  }
  return `/${segments.join("/")}`;
}

export function outFileForRoute(route: string): string {
  if (route === "/") return "index.html";
  const trimmed = route.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${trimmed}/index.html`;
}

export function discoverPages(srcDir: string): PageEntry[] {
  const files = listMarkdown(srcDir);
  const pages = files.map((filePath): PageEntry => {
    const rel = relative(srcDir, filePath);
    const route = routeForFile(rel);
    return { route, outFile: outFileForRoute(route), filePath };
  });
  pages.sort((a, b) => a.route.localeCompare(b.route));
  return pages;
}
