---
title: "Configuration"
description: "Full reference for @domphy/press site configuration."
---

# Configuration

## defineConfig

```ts
import { defineConfig } from "@domphy/press"

export default defineConfig({ /* SiteConfig */ })
```

`defineConfig` is a passthrough helper for TypeScript inference — it returns its argument typed as `SiteConfig`.

## SiteConfig

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Site title — appended to page titles |
| `description` | `string` | Default meta description |
| `base` | `string` | Deploy base path (e.g. `"/"` or `"/docs/"`) |
| `hostname` | `string` | Canonical hostname for sitemap and OG (e.g. `"https://example.com"`) |
| `srcDir` | `string` | Absolute path to the Markdown source directory |
| `outDir` | `string` | Absolute path to the build output directory |
| `head` | `string[]` | Raw `<head>` tags injected verbatim (analytics, icons) |
| `themeConfig` | `ThemeConfig` | Navigation, sidebar, footer, social links, etc. |
| `lastUpdated` | `boolean?` | Show last-updated date from `git log`. Default: `false` |
| `locales` | `Record<string, LocaleConfig>?` | i18n locale routing |

## ThemeConfig

| Field | Type | Description |
|---|---|---|
| `nav` | `NavItem[]` | Top navigation bar |
| `sidebar` | `Record<string, SidebarItem[]>` | Sidebar keyed by route prefix — longest match wins |
| `logo` | `string?` | Path to logo image |
| `search` | `false \| { placeholder?, limit? }?` | Built-in local search. Pass `false` to disable |
| `footerMessage` | `string?` | Footer content |
| `socialLinks` | `SocialLink[]?` | GitHub, Twitter, Discord, etc. icon links in header |
| `editLink` | `EditLink?` | "Edit this page" link (pattern: `https://github.com/…/:path`) |
| `outline` | `{ level: [number, number] }?` | TOC heading levels. Default: `[2, 3]` |
| `tocTitle` | `string?` | TOC section heading text. Default: `"On this page"` |
| `mermaid` | `boolean \| { cdn? }?` | Enable Mermaid diagrams (loaded via CDN) |
| `announcementBar` | `{ id?, text, dismissible? }?` | Dismissible banner above the page |
| `slots` | `LayoutSlots?` | Override individual layout regions with custom Domphy elements |

## NavItem

```ts
{ text: string; link?: string; items?: { text: string; link: string }[] }
```

- Flat link: `{ text: "Guide", link: "/guide/" }`
- Dropdown: `{ text: "Packages", items: [...] }`

## SidebarItem

```ts
{
  text: string
  link?: string
  items?: SidebarItem[]
  badge?: { text: string; type?: "tip" | "info" | "warning" | "danger" }
  collapsed?: boolean
}
```

## SocialLink

```ts
{ icon: "github" | "twitter" | "discord" | "youtube" | "npm" | string; link: string; ariaLabel?: string }
```

For custom icons, pass a URL or SVG data URI as `icon`.
