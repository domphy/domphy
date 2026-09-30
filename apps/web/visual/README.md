# Domphy visual regression

Playwright screenshots of every `[data-visual="<id>"]` cell in the patch/block
catalogs. Host is the **standalone** catalog server (not press islands).

## Run

```bash
# From apps/web — auto-starts serve-standalone on :4177
pnpm visual:update   # write baselines
pnpm visual           # compare

# One-shot dump for human review (no snapshot compare):
node visual/serve-standalone.mjs --port 4177   # terminal 1
node visual/shoot-all.mjs visual/shots-review-light
THEME=dark node visual/shoot-all.mjs visual/shots-review-dark
```

Catalogs (standalone query string):

- `/?catalog=patches` — UI patch prop/state matrices (`docs/demos/visual/patches-catalog.ts`)
- `/?catalog=blocks` — every `@domphy/blocks` demo

Press docs path `/visual/patches` exists but islands often don't mount
`data-visual` cells — always use the standalone host for screenshots.

Optional: `VISUAL_BASE_URL` (default `http://127.0.0.1:4177`).

## UI geometry audit (`pnpm visual:ui-geometry`)

Real-Chromium invariants over every `@domphy/ui` patch (packages/ui/tests/patch-catalog.ts
HOST + PATCH_ARGS, plus icon/value/placeholder/checkbox+label variants and the
documented container usages): R1 label centred in its control, R2 no unintended
overflow / clipped text, R3 line box fits the content box, R4 icon / indicator /
text share a centre, R5 same-kind siblings share a height and a focus ring is not
clipped. Matrix: font size 12/14/16/18/20/24 px on the root and on the host only,
host line-height normal/1.5/1.8, light + dark, five densities. It bundles
`ui-geometry-page.ts` itself (esbuild, `@domphy/*` aliased to SOURCE, so an edit to
`packages/ui/src` is picked up by the next run with no rebuild step) and starts no
server, so there is no port to clash on.

What a cell holds: the patch, its variants, and — for `dialog` / `drawer` /
`popover` / `tooltip` / `selectBox` / `combobox` — the surface that only exists
while open (the panel portals out of the cell, so it is measured separately,
while open, in the default density section; a floating patch that mounts no panel
is an R0 failure, which is also what proves the branch still runs). Two things are
deliberately NOT measured: a box painted by a `::before`/`::after` pseudo-element
(badge's count bubble) — the walk sees real elements only — and out-of-flow
overflow on a box that clips nothing: `scrollHeight` counts an absolutely
positioned decoration (timeline's connector reaching the next dot) the same as
content that failed to fit, so on `overflow: visible` R2 re-measures in-flow
descendants and text before it reports.

`GEOMETRY_PATCHES=tabs,select` mounts and asserts only those patches. Everything a
run writes hangs off that filter — `apps/web/.ui-qa/geometry/<run>/report.txt` (the
grouped failure list), `report.json`, and `shots/<patch>-{14,20}px-{light,dark}.png`
(one contact sheet per patch) — so several narrowed runs work side by side.
`GEOMETRY_RUN=<name>` names the folder instead; `GEOMETRY_SHOTS=0` skips the sheets.

```bash
GEOMETRY_PATCHES=button,toggleGroup,inputCheckbox pnpm --filter domphy-web visual:ui-geometry
```

## Regenerate blocks catalog

```bash
pnpm --filter domphy-web visual:blocks-gen
```

## CI note

Visual tests are **not** in the main CI pipeline by default (large baselines +
stable headless browser). Run locally after UI/blocks changes.
