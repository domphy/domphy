# Domphy visual QA — honest findings (2026-07-21)

## Coverage

| Catalog | Theme | Cells | Capture method |
| --- | --- | ---: | --- |
| Patches | light | 202 | full catalog + cell isolate (`shoot-all.mjs`) |
| Patches | dark | 202 | full catalog + cell isolate |
| Blocks | light | 173 | **solo page per block** (`?only=` + `shoot-blocks-solo.mjs`) |
| Blocks | dark | 173 | solo page per block |

Solo capture is required for blocks: mounting all 70 charts at once exhausts WebGL contexts (~blank canvases). Prior full-catalog blocks baselines were invalid for charts/globe.

Isolation (hide non-target cells + unstick sticky/fixed) fixed earlier wrong-content bleeds (Login05/android/dashboard showing sidebar chrome from neighbors).

## Verified fixed (re-shot)

| Item | Before | After |
| --- | --- | --- |
| Login05 content | Wrong (sidebar bleed) | Correct login form |
| Login02 full form | Cropped at password | Full form + OAuth + image |
| globe | Empty WebGL | Dotted globe + markers |
| chartArea / chartBar / chartPie | Blank (context limit / clip-path freeze) | Plots render |
| dashboard01 content | Wrong / truncated shell | Real dashboard (nav + KPI + chart + table) |
| safari URL | Center-clipped to `"mph"` | Full `"domphy.com"` (ellipsis + minWidth:0) |
| sticky sidebar bleed | Neighbor chrome in shots | Solo mount / isolation |

## Product fixes shipped this pass

1. **`safari` address bar** — URL used `overflow:hidden` + centered text without ellipsis; mid-string clip. Fix: `minWidth:0`, ellipsis, flex grow.
2. **`dashboard01` KPI cards** — 4-col grid too early inside sidebar shell → mid-glyph number clip + crushed footers. Fix: 4-col at `80em`, `minmax(12rem,1fr)`, wrap/ellipsis on text, `minWidth:0` on card.
3. **`bentoGrid` mosaic spans** — `gridColumn: span N` applied at all widths while parent is 1-col below 64em → skinny vertical strips. Fix: spans only under `@media (min-width: 64em)`.
4. **Visual harness** — solo capture stage sizes, no false `maxHeight` crop on layouts, `block` layout for shells, taller Playwright viewport, `blocks-import-map` gen (`resolve` not `join`).

## Honest remaining defects

### Major

| id | issue | evidence |
| --- | --- | --- |
| `button-solid-warning` vs `primary` | Warning solid ≈ primary brown (not amber) | Computed: warning `rgb(81,37,4)` ≈ primary `rgb(80,32,0)` |
| `button-solid-error` vs `danger` | Same maroon fill | Both `rgb(108,0,0)` |
| `android` / `iphone` demos | Empty black screens | Frames only — demos call `android()` / `iphone()` with no `src` |
| `safari` demo content | Empty white viewport | No `imageSrc` in demo (chrome OK) |
| Interaction-only effects | Near-empty cells when animations frozen | `confetti`, `smoothCursor`, `scrollProgress`, `spinningText` (~426B PNGs) |

### Minor / note

| id | issue |
| --- | --- |
| `button-*-disabled` / `link-state-disabled` | Contrast ~1.7–2.9:1 (disabled recipe; intentional dim) |
| `terminal` | Mid-type freeze under `animation:none` |
| `chart*Legend` / `*Icons` variants | Some missing legend/icon chrome (demo data or recipe) |
| `orbitingCircles` | Center logo only when motion frozen |
| Patch active tabs/toggle/segmented | **Not** white-on-peach: measured contrast 7.8–13.5:1 dark brown on light; earlier vision report was a false positive |

### Catalog / harness notes

- Multi-cell blocks catalog still clips tall layouts (`maxHeight` on layouts) by design for density; use solo for truth.
- `visualPage` `maxWidth: 1400px` — fine for 1280 layout stage.
- Empty device/effect demos are **demo data** gaps, not frame bugs (except bento span which was real).

## Contrast probe (light patches, Playwright computed)

```
tabs Overview selected:      13.57:1  (dark brown on white)
toggleGroup B pressed:        8.02:1  (dark brown on peach)
segmented Month selected:     7.85:1
button solid primary:        13.57:1  (white on dark brown)
button solid disabled:        2.93:1  (known low)
pagination page 2 active:    13.57:1
```

## Files changed (this session)

- `apps/web/scripts/gen-visual-blocks.mjs` — import map path + wider layout cells
- `apps/web/docs/demos/visual/cell.ts` — `minHeight` / `block` opts
- `apps/web/docs/demos/visual/blocks-import-map.ts` — generated
- `apps/web/visual/standalone-entry.ts` — solo sizing, no clip
- `apps/web/visual/shoot-blocks-solo.mjs` — 1440×1200 viewport
- `packages/blocks/.../safari.ts` — address bar ellipsis
- `packages/blocks/.../dashboard-01.ts` — KPI grid/text
- `packages/blocks/.../bentoGrid.ts` — responsive column spans

## Not done / deferred honestly

- Theme ramp separation for warning vs primary / error vs danger (palette design, not a one-line patch).
- Demo content for device frames + confetti/cursor (demo authoring).
- Full Playwright snapshot baseline update in-repo (`catalog.spec.ts-snapshots`) — reshoot artifacts live under scratch; promote after green visual review on CI if desired.
- Dark-theme human pixel review of every cell (automated dark shoot done; vision batch was light-first).
