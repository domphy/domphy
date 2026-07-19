---
title: "Customization"
description: "Override layout slots, frontmatter controls, and CSS theming in @domphy/press."
---

# Customization

## Component slots

Every major layout region can be replaced with a custom Domphy element via `themeConfig.slots`. Each slot receives the full `LayoutContext` and must return a `DomphyElement | null`.

```ts
import { defineConfig, type LayoutContext, type DomphyElement } from "@domphy/press"
import { themeColor, themeSpacing } from "@domphy/theme"
import { toolbar } from "@domphy/ui"

export default defineConfig({
  themeConfig: {
    slots: {
      header: (ctx: LayoutContext): DomphyElement => ({
        header: [
          { a: ctx.config.title, href: ctx.config.base },
          {
            nav: ctx.config.themeConfig.nav.map(item => ({
              a: item.text, href: item.link,
            })),
            $: [toolbar({ gap: 4 })],
          },
        ],
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: `0 ${themeSpacing(6)}`,
          height: themeSpacing(14),
          background: themeColor(null, "shift-1"),
          borderBottom: `1px solid ${themeColor(null, "shift-3")}`,
        },
      }),
    },
  },
})
```

### Available slots

| Slot | Replaces |
|---|---|
| `header` | The entire header bar (logo, nav, actions) |
| `sidebar` | The sidebar navigation panel |
| `aside` | The TOC aside panel |
| `prevNext` | The prev/next pagination row |
| `docFooter` | Edit link + last-updated row |
| `footer` | The page footer bar |

Returning `null` from a slot omits the region entirely.

### LayoutContext

Every slot function receives:

```ts
interface LayoutContext {
  route: string                          // current route, e.g. "/guide/intro"
  title: string                          // page title from frontmatter or h1
  body: DomphyElement[]                  // parsed markdown body elements
  toc: TocEntry[]                        // table of contents entries
  frontmatter: Record<string, unknown>   // raw frontmatter values
  config: SiteConfig                     // full site config
  lastUpdated?: string                   // ISO date from git, if enabled
  readingTime?: number                   // estimated minutes
  filePath?: string                      // relative path from srcDir
}
```

## Frontmatter controls

Add these to the frontmatter of any `.md` file to control per-page behavior.

| Key | Type | Description |
|---|---|---|
| `title` | `string` | Page title (overrides the first `# h1`) |
| `description` | `string` | Meta description for this page |
| `badge` | `string \| { text, type }` | Badge shown next to the page title |
| `sidebar` | `false` | Hide the sidebar and expand the content to full width |
| `aside` | `false` | Hide the TOC aside panel |
| `draft` | `true` | Exclude the page from the build output |
| `hero` | `HeroConfig` | Enable the home page hero section |
| `features` | `FeatureConfig[]` | Enable the home page features grid |
| `fullBleed` | `true` | Home layout only: drop the fixed-width main column — prose blocks center themselves, bare island placeholders span edge-to-edge |

### Example

```md
---
title: "API Reference"
badge: { text: "Beta", type: "warning" }
sidebar: false
---

Full-width content without sidebar navigation.
```

## CSS theming

All layout element styles come from Domphy's `generateCSS()` (inline `style:{}` objects on elements). The `pressCSS()` function covers only the global reset and markdown-rendered HTML content (code blocks, custom blocks, etc.).

### Theme tokens

Use CSS custom properties from `@domphy/theme` in your own styles. The same tokens drive the built-in layout:

```ts
import { themeColor, themeSpacing } from "@domphy/theme"

const brand = themeColor(null, "shift-9", "primary")  // var(--primary-9)
const border = themeColor(null, "shift-3")             // var(--neutral-3)
const space4 = themeSpacing(4)                         // "1em"
```

These resolve via CSS variables, so dark mode works automatically.

### Injecting extra CSS

Add a `<style>` tag via `config.head`:

```ts
import { themeColor } from "@domphy/theme"

export default defineConfig({
  head: [
    `<style>
      /* custom scrollbar */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-thumb { background: ${themeColor(null, "shift-3")}; border-radius: 3px; }
    </style>`,
  ],
})
```

### Overriding with a custom slot

For layout-level changes, replace the slot and use inline `style:{}` with Domphy theme tokens — this is the approach that keeps everything in `generateCSS()`:

```ts
slots: {
  footer: (ctx) => ({
    footer: `© ${new Date().getFullYear()} My Company`,
    style: {
      padding: `${themeSpacing(4)} ${themeSpacing(8)}`,
      background: themeColor(null, "shift-1"),
      borderTop: `1px solid ${themeColor(null, "shift-3")}`,
      fontSize: "13px", color: themeColor(null, "shift-6"),
      textAlign: "center",
    },
  }),
},
```

## Logo variants

Pass an object with `light` and `dark` image paths to `themeConfig.logo` to show different logos per theme:

```ts
themeConfig: {
  logo: {
    light: "/logo-light.svg",
    dark:  "/logo-dark.svg",
  },
}
```

Press automatically hides the appropriate variant using `[data-theme]` attribute switching.

## Announcement bar

Show a dismissible banner above the header:

```ts
themeConfig: {
  announcementBar: {
    id: "v2-release",       // unique ID stored in localStorage to remember dismissal
    text: "🎉 v2.0 is out! <a href='/blog/v2'>Read the post →</a>",
    dismissible: true,      // default: true
  },
}
```

Set `id` so the user only sees it once per release. Omit `id` to always show on page load.
