import { readdirSync, statSync } from "node:fs"
import { join, posix, relative, sep } from "node:path"
import type { PageEntry, SidebarItem, SiteConfig } from "./types.js"

const NON_PAGE_DIRS = new Set(["snippets", "demos", "node_modules", ".git"])

export function routeForFile(srcRelativePath: string): string {
  const posixPath = srcRelativePath.split(sep).join(posix.sep)
  const withoutExt = posixPath.replace(/\.md$/, "")
  const segments = withoutExt.split("/")
  const last = segments[segments.length - 1]
  if (last === "index") {
    segments.pop()
    return segments.length === 0 ? "/" : `/${segments.join("/")}/`
  }
  return `/${segments.join("/")}`
}

export function outFileForRoute(route: string): string {
  if (route === "/") return "index.html"
  const trimmed = route.replace(/^\/+/, "").replace(/\/+$/, "")
  return `${trimmed}/index.html`
}

function listMarkdown(dir: string): string[] {
  const found: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      if (NON_PAGE_DIRS.has(name) || name.startsWith(".")) continue
      found.push(...listMarkdown(full))
    } else if (name.endsWith(".md") && name.toLowerCase() !== "readme.md") {
      found.push(full)
    }
  }
  return found
}

export function discoverPages(srcDir: string): PageEntry[] {
  const files = listMarkdown(srcDir)
  const pages = files.map((filePath): PageEntry => {
    const rel = relative(srcDir, filePath)
    const route = routeForFile(rel)
    return { route, outFile: outFileForRoute(route), filePath }
  })
  pages.sort((a, b) => a.route.localeCompare(b.route))
  return pages
}

export function flattenSidebar(items: SidebarItem[]): { text: string; link: string }[] {
  const out: { text: string; link: string }[] = []
  for (const item of items) {
    if (item.link) out.push({ text: item.text, link: item.link })
    if (item.items) out.push(...flattenSidebar(item.items))
  }
  return out
}

export function sidebarForRoute(route: string, config: SiteConfig): SidebarItem[] {
  let bestPrefix = ""
  for (const prefix of Object.keys(config.themeConfig.sidebar)) {
    if (route.startsWith(prefix) && prefix.length > bestPrefix.length) {
      bestPrefix = prefix
    }
  }
  return bestPrefix ? config.themeConfig.sidebar[bestPrefix] : []
}

export function prevNextForRoute(
  route: string,
  config: SiteConfig,
): { prev?: { text: string; link: string }; next?: { text: string; link: string } } {
  const flat = flattenSidebar(sidebarForRoute(route, config))
  const index = flat.findIndex(
    (item) =>
      item.link === route ||
      item.link === route.replace(/\/$/, "") ||
      `${item.link}/` === route,
  )
  if (index === -1) return {}
  return {
    prev: index > 0 ? flat[index - 1] : undefined,
    next: index < flat.length - 1 ? flat[index + 1] : undefined,
  }
}
