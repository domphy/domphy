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

## QA layers (how this package stays trustworthy)

Every block passes four independently-runnable QA tiers; run them after ANY block change, cheapest first:

1. **Lifecycle harness** — `npx vitest run tests/lifecycle-harness.test.ts`. Mechanically drives every exported factory through mount → ancestor re-render (fresh factory closure on reused DOM nodes — the framework's hardest historical bug class) → unmount, and records construct/render errors, `console.error`s, window/document listener leaks, timers/rAF still re-arming after unmount, and DOM residue. Writes `.lifecycle-report.json`; a clean report means zero findings across all blocks.
2. **Doctor conformance** — `node ../doctor/dist/cli.js src/index.ts --format text` (whole barrel in one probe) or per file. Policy for ports: pixel fidelity outranks tokenization — intentional upstream typography goes through `shared/typography.ts`'s `fixed()` (function values are doctor's designed marker for deliberate non-token typography), effect-identity colors outside the tone system carry a justified `_doctorDisable`, and everything else uses real theme tokens.
3. **Unit + interaction tests** — `npx vitest run` (508+ tests, including real interaction tests for the 94 interactive blocks).
4. **Visual compare vs upstream reference** — `pnpm visual-compare` (on-demand Playwright side-by-side screenshots; see SOURCES.md for the fidelity history: visual-diff pass, direct-source-diff pass, shared-root fidelity pass).

Recurring find-fix classes and their one-shot recipes (learned across QA waves — apply the recipe, don't rediscover): missing `type="button"` on non-submit buttons; unlabeled inputs (link `htmlFor`+`id`, or visually-hidden label); `missing-color` next to themed backgrounds (add the surface-appropriate `themeColor` even when visually inert); zero lengths with units (`0px` → `0`); family-wide issues live in the `*-shared.ts` helpers — fix once there, never per block.
