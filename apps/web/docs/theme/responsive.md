---
title: "Responsive Design"
description: "Breakpoints, container queries, adaptive layouts, and viewport-aware state."
---

# Responsive Design

## CSS breakpoints

Domphy has no JavaScript breakpoint API — use standard CSS media queries directly in `style` objects or `<style>` tags:

```ts
// Inline style with CSS string for media queries
const Layout = {
  div: [Sidebar, Content],
  style: `
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @media (min-width: 768px) {
      grid-template-columns: 240px 1fr;
    }
    @media (min-width: 1280px) {
      grid-template-columns: 280px 1fr 240px;
    }
  `,
}
```

**Standard breakpoints (Material Design 3 / Bootstrap aligned):**

| Name | Width | Typical target |
|------|-------|----------------|
| `sm` | ≥ 480px | Large phones |
| `md` | ≥ 768px | Tablets |
| `lg` | ≥ 1024px | Small desktops |
| `xl` | ≥ 1280px | Desktops |
| `2xl` | ≥ 1536px | Large monitors |

## Reactive breakpoints with `matchMedia`

For JavaScript-driven layout changes (e.g. mounting different components on mobile vs desktop), observe `matchMedia`:

```ts
import { toState } from "@domphy/core"

const isMobile = toState(window.matchMedia("(max-width: 767px)").matches)

const mql = window.matchMedia("(max-width: 767px)")
mql.addEventListener("change", (e) => isMobile.set(e.matches))

// Use in components
const Navigation = {
  nav: (l) => isMobile.get(l) ? MobileNav : DesktopNav,
}
```

## Utility: `createBreakpoint`

Create a reusable reactive breakpoint helper:

```ts
import { toState } from "@domphy/core"

function createBreakpoint(query: string) {
  const state = toState(window.matchMedia(query).matches)
  const mql = window.matchMedia(query)
  mql.addEventListener("change", (e) => state.set(e.matches))
  return state
}

const isMd = createBreakpoint("(min-width: 768px)")
const isLg = createBreakpoint("(min-width: 1024px)")
const isDark = createBreakpoint("(prefers-color-scheme: dark)")

const Header = {
  header: (l) => isLg.get(l) ? FullHeader : CompactHeader,
}
```

## Container queries

Container queries respond to the container's width rather than the viewport — ideal for reusable components:

```ts
// Define a container
const Card = {
  div: CardContent,
  style: {
    containerType: "inline-size",
    containerName: "card",
  },
}
```

```css
/* CSS for responsive card layout */
.card-content { display: block; }

@container card (min-width: 400px) {
  .card-content {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }
}
```

## Adaptive navigation

Mobile-first navigation pattern — collapse to a hamburger on small screens:

```ts
import { toState } from "@domphy/core"
import { button } from "@domphy/ui"

const menuOpen = toState(false)

const MobileMenuButton = {
  button: (l) => menuOpen.get(l) ? "✕" : "☰",
  $: [button()],
  onClick: () => menuOpen.set((v) => !v),
  style: { display: "none", "@media(max-width:767px)": { display: "flex" } },
}

const NavLinks = {
  ul: [
    { li: { a: "Home", href: "/" } },
    { li: { a: "Docs", href: "/docs" } },
  ],
  style: (l) => ({
    display: menuOpen.get(l) ? "flex" : "none",
    "@media(min-width:768px)": { display: "flex" },
    flexDirection: "column",
    "@media(min-width:768px)": { flexDirection: "row" },
  }),
}
```

## Adaptive images

Use `srcset` and `sizes` for responsive images — no JavaScript needed:

```ts
const HeroImage = {
  img: null,
  src: "/hero-800.jpg",
  srcset: "/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1600.jpg 1600w",
  sizes: "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 800px",
  alt: "Hero",
  loading: "lazy",
  style: { width: "100%", height: "auto" },
}
```

## Hiding elements on mobile/desktop

Use `hidden` reactively:

```ts
const DesktopSidebar = {
  aside: SidebarContent,
  hidden: (l) => !isLg.get(l),
}

const MobileDrawer = {
  div: SidebarContent,
  hidden: (l) => isLg.get(l),
}
```

Or pure CSS:

```ts
const DesktopOnlyColumn = {
  div: Content,
  style: { "@media(max-width:767px)": { display: "none" } },
}
```

## Fluid spacing

Scale padding/margins with viewport width using `clamp()`:

```ts
const Section = {
  section: Content,
  style: {
    padding: "clamp(1rem, 5vw, 4rem)",   // 16px → 64px as viewport grows
  },
}
```

## Dark mode

Respond to the user's system preference:

```ts
const prefersDark = createBreakpoint("(prefers-color-scheme: dark)")

// Apply theme based on system preference (if user hasn't manually set one)
prefersDark.subscribe((dark) => {
  const saved = localStorage.getItem("dp-theme")
  if (!saved) {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light")
  }
})
```

Or let the `RUNTIME_SCRIPT` handle it — the script in `@domphy/press` (and `apps/web/html-template.ts`) reads `localStorage` and applies the saved theme on first load.

## SSR considerations

`window.matchMedia` is not available in Node.js. Guard breakpoint code:

```ts
const isClient = typeof window !== "undefined"

const isMobile = toState(
  isClient ? window.matchMedia("(max-width: 767px)").matches : false
)

if (isClient) {
  const mql = window.matchMedia("(max-width: 767px)")
  mql.addEventListener("change", (e) => isMobile.set(e.matches))
}
```

With `@domphy/app` SSR, breakpoints should be resolved client-side via hydration — avoid rendering different HTML on server vs client to prevent hydration mismatches.
