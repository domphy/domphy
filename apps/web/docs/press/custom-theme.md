---
title: "Custom Theme & Slots"
description: "Override layout regions, customize colors and fonts, and extend the press theme for brand-specific doc sites."
---

# Custom Theme & Slots

## Slot system overview

`@domphy/press` exposes named layout slots — replace any region of the default layout without rebuilding the entire shell:

```ts
// press.config.ts
import { defineConfig } from "@domphy/press"
import { CustomLogo, CustomFooter, CustomSidebarHeader } from "./theme"

export default defineConfig({
  themeConfig: {
    slots: {
      logo: CustomLogo,           // replace the site logo
      footer: CustomFooter,       // replace the footer
      sidebarHeader: CustomSidebarHeader,   // insert above sidebar nav
      navBefore: AnnouncementBar, // before the top nav
      contentBefore: EditBanner,  // before every page's content
      contentAfter: PageFeedback, // after every page's content
    },
  },
})
```

## Available slots

| Slot | Location | Default |
|------|----------|---------|
| `logo` | Top-left of nav | Site title text |
| `navBefore` | Before the nav bar | — |
| `navAfter` | After the nav bar | — |
| `sidebarHeader` | Top of sidebar panel | — |
| `sidebarFooter` | Bottom of sidebar panel | — |
| `contentBefore` | Before page content | — |
| `contentAfter` | After page content | — |
| `footer` | Bottom of every page | Auto-generated |
| `docAside` | Right side TOC panel | TOC |
| `notFound` | 404 page | Default 404 |

## Custom logo

Replace the text logo with an SVG or image:

```ts
const CustomLogo = {
  a: [
    {
      img: null,
      src: "/logo.svg",
      alt: "My Docs",
      style: { height: "28px", width: "auto" },
    },
  ],
  href: "/",
  style: { display: "flex", alignItems: "center" },
}
```

## Theme colors

Override the press theme colors to match your brand. The press theme uses Domphy `@domphy/theme` — set theme variables on `:root`:

```ts
// In press.config.ts — inject CSS into the head
export default defineConfig({
  head: [
    `<style>
      :root {
        /* Override primary color family */
        --primary-hue: 260;    /* purple */
        --primary-chroma: 0.18;

        /* Override neutral warmth */
        --neutral-hue: 240;
        --neutral-chroma: 0.01;
      }
    </style>`,
  ],
})
```

Or use `themeApply` in a client script:

```ts
// client/theme-setup.ts
import { themeApply } from "@domphy/theme"

themeApply(document.documentElement, {
  primary: { hue: 260, chroma: 0.18 },
  neutral: { hue: 240, chroma: 0.01 },
})
```

## Custom fonts

Add Google Fonts or self-hosted fonts:

```ts
export default defineConfig({
  head: [
    `<link rel="preconnect" href="https://fonts.googleapis.com">`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code&display=swap">`,
    `<style>
      :root {
        --font-sans: 'Inter', system-ui, sans-serif;
        --font-mono: 'Fira Code', monospace;
      }
    </style>`,
  ],
})
```

## Custom CSS

Inject global CSS for the docs site:

```ts
export default defineConfig({
  head: [
    `<style>
      /* Wider content area */
      .doc-content { max-width: 900px; }

      /* Custom code block style */
      .shiki { border-radius: 8px; border: 1px solid var(--neutral-3); }

      /* Hide sidebar on print */
      @media print {
        .doc-sidebar { display: none; }
        .doc-content { max-width: 100%; }
      }
    </style>`,
  ],
})
```

## Custom footer

```ts
const Footer = {
  footer: [
    {
      div: [
        { span: "© 2025 My Company" },
        { a: "Privacy", href: "/privacy" },
        { a: "Terms", href: "/terms" },
      ],
      style: {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        padding: "2rem",
        borderTop: "1px solid var(--neutral-3)",
      },
    },
  ],
}
```

## Page-level slots with frontmatter

Control slots per-page using frontmatter:

```md
---
title: "Getting Started"
layout: home
aside: false
---
```

```ts
// In press.config.ts — react to page-level layout options
export default defineConfig({
  themeConfig: {
    slots: {
      docAside: (context) =>
        context.frontmatter.aside === false ? null : DefaultTOC,
    },
  },
})
```

`context` receives:
- `context.frontmatter` — the page's frontmatter object
- `context.route` — current route path
- `context.sidebar` — resolved sidebar for the current route

## Announcement bar

Show a dismissible banner at the top of the site:

```ts
export default defineConfig({
  themeConfig: {
    announcementBar: {
      id: "v2-release",   // unique — controls dismiss state in localStorage
      content: "🎉 Domphy v2.0 is out! <a href='/blog/v2'>Read the release notes</a>",
      closeable: true,
    },
  },
})
```

## Extending the layout component

For deeper customization beyond slots — replace the entire layout:

```ts
import { createPressLayout } from "@domphy/press/browser"

const CustomLayout = createPressLayout({
  // Override render functions for each layout region
  renderNav: (context) => CustomNav,
  renderSidebar: (context) => CustomSidebar,
  renderContent: (context, content) => ({
    article: [
      CustomContentHeader(context),
      content,
      CustomContentFooter(context),
    ],
  }),
})

export default defineConfig({
  themeConfig: {
    layout: CustomLayout,
  },
})
```
