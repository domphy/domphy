// Browser-safe subset of routes.ts — no Node.js built-ins (no fs/path).
// The file-discovery functions (discoverPages) stay in routes.ts (Node.js-only).
import type { SidebarItem, SiteConfig } from "./types.js";

export function flattenSidebar(
  items: SidebarItem[],
): { text: string; link: string }[] {
  const out: { text: string; link: string }[] = [];
  for (const item of items) {
    if (item.link) out.push({ text: item.text, link: item.link });
    if (item.items) out.push(...flattenSidebar(item.items));
  }
  return out;
}

export function sidebarForRoute(
  route: string,
  config: SiteConfig,
): SidebarItem[] {
  let bestPrefix = "";
  for (const prefix of Object.keys(config.themeConfig.sidebar)) {
    if (route.startsWith(prefix) && prefix.length > bestPrefix.length) {
      bestPrefix = prefix;
    }
  }
  return bestPrefix ? config.themeConfig.sidebar[bestPrefix] : [];
}

export function prevNextForRoute(
  route: string,
  config: SiteConfig,
): {
  prev?: { text: string; link: string };
  next?: { text: string; link: string };
} {
  const flat = flattenSidebar(sidebarForRoute(route, config));
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
