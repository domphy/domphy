---
title: "Configuration"
description: "Full reference for @domphy/press site configuration."
---

# Configuration

## defineConfig

```ts
import { defineConfig } from "@domphy/press"

export default defineConfig({ /* UserConfig */ })
```

`defineConfig` builds a **new** `SiteConfig` — it is not a passthrough. Input type is `UserConfig` (`base` / `srcDir` / `outDir` / `head` optional). Defaults applied:

| Field | Default |
|---|---|
| `base` | `"/"` |
| `srcDir` | `"."` |
| `outDir` | `"dist"` |
| `head` | `[]` |
| `themeConfig` | merged onto `{ nav: [], sidebar: {} }` |

The CLI runs loaded plain-object configs through `defineConfig` as well, so they get the same defaults.

`srcDir` and `outDir` on the returned `SiteConfig` stay as those path strings (relative unless you pass an absolute path). The CLI `resolve()`s them against `process.cwd()` at `build` / `dev` time.

## SiteConfig

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Site title — appended to page titles |
| `description` | `string` | Default meta description |
| `base` | `string` | Deploy base path (e.g. `"/"` or `"/docs/"`) — internal nav/sidebar/hero links, root-relative links and images written in the Markdown, and canonical/sitemap/OG URLs are prefixed automatically (write them root-relative). `domphy-press dev`/`preview` serve the site at this prefix too. Default `"/"` |
| `hostname` | `string` | Canonical hostname for sitemap and OG (e.g. `"https://example.com"`) |
| `srcDir` | `string` | Markdown source directory. Default `"."` (relative). The CLI `resolve()`s it against `process.cwd()` at build/dev time |
| `outDir` | `string` | Build output directory. Default `"dist"` (relative). Same CLI resolve as `srcDir` |
| `head` | `string[]` | Raw `<head>` tags injected verbatim (analytics, icons). Default `[]` |
| `themeConfig` | `ThemeConfig` | Navigation, sidebar, footer, social links, etc. `defineConfig` merges the value you pass onto `{ nav: [], sidebar: {} }` |
| `lastUpdated` | `boolean?` | Show last-updated date from `git log`. Default: `false` |
| `continueOnError` | `boolean?` | Keep building (and exit 0) when individual pages fail. Default: `false` — any page error fails the build |
| `cspNonce` | `string?` | Content-Security-Policy nonce stamped on every inline `<script>`/`<style>` press emits and forwarded to `@domphy/app` SSR |
| `locales` | `Record<string, LocaleConfig>?` | i18n locale routing |
| `markdown` | `Record<string, never>?` | Reserved for future markdown plugin configuration. Currently a no-op. |

## ThemeConfig

| Field | Type | Description |
|---|---|---|
| `nav` | `NavItem[]` | Top navigation bar |
| `sidebar` | `Record<string, SidebarItem[]>` | Sidebar keyed by route prefix — longest match wins |
| `logo` | `string \| { light: string; dark: string }?` | Logo image — single URL or separate light/dark variants |
| `search` | `false \| { placeholder?, limit? }?` | Built-in local search. Pass `false` to disable |
| `footerMessage` | `string?` | Footer content (HTML via `rawHtml()` — keep to markup you control) |
| `socialLinks` | `SocialLink[]?` | GitHub, Twitter, Discord, etc. icon links in header |
| `editLink` | `EditLink?` | "Edit this page" link (pattern: `https://github.com/…/:path`) |
| `outline` | `{ level: [number, number] }?` | TOC heading levels. Default: `[2, 3]` |
| `tocTitle` | `string?` | TOC section heading text. Default: `"On this page"` |
| `mermaid` | `boolean \| { cdn? }?` | Enable Mermaid diagrams (loaded via CDN) |
| `announcementBar` | `{ id?, text, dismissible? }?` | Dismissible banner above the page. `text` is HTML via `rawHtml()` (same contract as `footerMessage`) |
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
{ icon: "github" | "twitter" | "discord" | "youtube" | "linkedin" | "mastodon" | "npm" | "bluesky" | string; link: string; ariaLabel?: string }
```

For custom icons, pass a URL or SVG data URI as `icon`.
