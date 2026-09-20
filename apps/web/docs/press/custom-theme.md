---
title: "Custom Theme & Slots"
description: "Brand a press site: layout slots, logo, fonts, theme tokens, announcement bar."
---

# Custom Theme & Slots

Slot names, `LayoutContext`, and frontmatter flags live on [Customization](/docs/press/customization). This page is the branding path: logo, fonts, colors, announcement bar.

Shipped `LayoutSlots` keys: `header`, `sidebar`, `aside`, `prevNext`, `docFooter`, `footer`. There is no `logo` / `navBefore` / `sidebarHeader` / `contentBefore` / `docAside` / `notFound` slot. Logo is `themeConfig.logo`. TOC is the `aside` slot. 404 is generated HTML, not a slot.

```ts
import { defineConfig, type LayoutContext, type DomphyElement } from "@domphy/press"

export default defineConfig({
  themeConfig: {
    logo: "/logo.svg",
    slots: {
      footer: (_ctx: LayoutContext): DomphyElement => ({
        footer: "© 2026 My Company",
      }),
    },
  },
})
```

`pageShell(ctx)` and `homeShell(ctx)` each take **one** argument. Page content is `ctx.body`, not a second parameter. `LayoutContext` has `route`, `title`, `body`, `toc`, `frontmatter`, `config`, `lastUpdated?`, `readingTime?`, `filePath?` — no `sidebar` field (the sidebar comes from `config.themeConfig.sidebar`).

## Logo

```ts
export default defineConfig({
  themeConfig: {
    logo: "/logo.svg",
    // or per scheme:
    // logo: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
  },
})
```

## Fonts

Press reads `--dp-font-sans`, `--dp-font-mono`, `--dp-font-display` — not `--font-sans`. Layout classes are `dp-sidebar-*` / `dp-toc`, not `.doc-content`.

```ts
export default defineConfig({
  head: [
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code&display=swap">`,
    `<style>:root{--dp-font-sans:"Inter",system-ui,sans-serif;--dp-font-mono:"Fira Code",ui-monospace,monospace}</style>`,
  ],
})
```

## Colors

`@domphy/theme` does not emit `--primary-hue` / `--primary-chroma`. Change ramps with `setTheme` + `themeApply()`, or override the generated `--{family}-{N}` variables. `themeApply()` writes into a `<style>` tag — call it from client code after `setTheme`, not as a font API.

```ts
import { setTheme, themeApply } from "@domphy/theme"

setTheme("light", { colors: { primary: [/* 18 hexes */] } })
themeApply()
```

Custom roles must also be registered on `"light"` or `themeColor()` throws. `setTheme` does not auto-reverse into `dark`.

## Announcement bar

```ts
export default defineConfig({
  themeConfig: {
    announcementBar: {
      id: "v2-release",
      text: "Domphy v2 is out. <a href='/blog/v2'>Notes</a>",
      dismissible: true,
    },
  },
})
```

`text` is wrapped in `rawHtml()` — keep it to markup you control. Dismiss state is keyed by `id` in `localStorage`.
