# @domphy/blocks

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/blocks/) · [npm](https://www.npmjs.com/package/@domphy/blocks)

173 composed blocks and effect components for Domphy: sidebar layouts, auth pages, a dashboard, `@domphy/chart` recipes, and marketing/effect components — clean-room reimplemented from the public behavior of shadcn/ui and Magic UI.

## Install

```bash
npm install @domphy/blocks
```

Peer dependencies: `@domphy/core`, `@domphy/theme`, `@domphy/ui`, `@domphy/chart`, `@domphy/form`, `@domphy/table` (only the ones a given block actually imports need to be present at runtime).

## Quick start

Every export is a factory function, not a `$`-patch — call it directly to get a complete, mountable element tree:

```ts
import { sidebar07, dashboard01, marquee } from "@domphy/blocks"

const App = sidebar07() // works with zero arguments — renders a working demo

const Dashboard = dashboard01({
  title: "Overview",
  navItems: [{ label: "Home", href: "/" }, { label: "Settings", href: "/settings" }],
})
```

`props` is a single optional object with sane defaults; only the genuinely variable parts (data/items/labels/colors) are parameterized. Layout and structure stay a fixed literal tree — closer to a "copy-paste block" than a heavily configurable component. Need something the props don't cover? Copy the block's source out of `node_modules` and edit it, the same way you would a shadcn block.

## What's in the box

| Source | Count | Contents |
|---|---|---|
| shadcn/ui | 27 | 16 sidebar layouts, 10 auth pages, 1 dashboard |
| shadcn/ui charts | 70 | `@domphy/chart` recipe presets (area/bar/line/pie/radar/radial/tooltip) |
| Magic UI | 76 | Text animations, backgrounds, buttons, device mocks, marketing effects |

See [`SOURCES.md`](./SOURCES.md) for the full manifest (export, file, reference URL, status, fidelity notes), or [`registry.json`](./registry.json) for the machine-readable form.

## Methodology: clean-room implementation

Every component was implemented independently from a written functional/visual specification — one pass records only the behavior/appearance of the public reference (never source code), a separate pass implements from that spec alone, having never seen or browsed the original source or website. No third-party source code is copied or redistributed. See the [Methodology docs](https://domphy.com/docs/blocks/methodology) for details, including how to run the on-demand Playwright visual-compare script (`pnpm --filter @domphy/blocks visual-compare`) to check a block against its public reference.

See the [full docs](https://domphy.com/docs/blocks/) for the complete catalog and API reference.
