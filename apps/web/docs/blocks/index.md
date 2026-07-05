---
title: "@domphy/blocks"
description: "Large composed UI blocks for Domphy — dashboards, auth pages, sidebars, chart recipes, and marketing/effect components, clean-room reimplemented from the public behavior of shadcn/ui and Magic UI."
---

# @domphy/blocks

173 ready-to-use composed blocks and effect components: application shells (sidebar layouts, auth pages, a dashboard), chart recipes for `@domphy/chart`, and marketing/effect components (animated backgrounds, text effects, cards, buttons). Every export is a factory function you call directly — not a `$`-patch you apply to your own tag.

This package exists for two reasons: it is a genuinely useful "bigger than a button" component library, and it doubles as an integration test — building real-world compositions is what surfaces gaps in the rest of the ecosystem (`@domphy/ui`, `@domphy/chart`, `@domphy/table`, `@domphy/form`) that small demos never would.

## Install

```bash
npm install @domphy/blocks
```

Peer dependencies: `@domphy/core`, `@domphy/theme`, `@domphy/ui`, `@domphy/chart`, `@domphy/form`, `@domphy/table` (only the ones a given block actually imports need to be present at runtime — see each block's own imports).

## Quick start

```ts
import { sidebar07, dashboard01, marquee } from "@domphy/blocks"

// Every export is a factory function with an optional props object and
// sane defaults, so calling it with no arguments renders a working demo.
const App = sidebar07()

// Pass data/labels/colors — the genuinely variable parts — as props.
const Dashboard = dashboard01({
  title: "Overview",
  navItems: [{ label: "Home", href: "/" }, { label: "Settings", href: "/settings" }],
})
```

## What's in the box

- **[shadcn/ui blocks + chart recipes](/docs/blocks/shadcn)** — 16 sidebar layouts, 10 auth pages, 1 dashboard, 70 `@domphy/chart` recipe presets.
- **[Magic UI](/docs/blocks/magicui)** — 76 marketing/effect components (text animations, backgrounds, buttons, device mocks).
- **[Methodology](/docs/blocks/methodology)** — how these were built (clean-room implementation) and how to compare a block against its public reference.
- **[API reference](/docs/blocks/api)** — the factory-function contract every export follows, and where to find each block's own props.

## Full catalog

See [`SOURCES.md`](https://github.com/domphy/domphy/blob/main/packages/blocks/SOURCES.md) in the repo for the complete, generated manifest (export name, source file, reference URL, status, and fidelity notes) for all 173 components.
