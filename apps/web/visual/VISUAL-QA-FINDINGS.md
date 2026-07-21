# Domphy visual QA — honest findings (2026-07-21)

## Coverage

| Catalog | Theme | Cells | Capture method |
| --- | --- | ---: | --- |
| Patches | light | 202 | full catalog + cell isolate (`shoot-all.mjs`) |
| Patches | dark | 202 | full catalog + cell isolate |
| Blocks | light | 173 | **solo page per block** (`?only=` + `shoot-blocks-solo.mjs`) |
| Blocks | dark | 173 | solo page per block |

Solo capture is required for blocks: mounting all 70 charts at once exhausts WebGL contexts (~blank canvases).

## Verified fixed

| Item | Before | After |
| --- | --- | --- |
| Login05 / Login02 | Sidebar bleed / cropped form | Correct full login shells |
| globe + charts | Blank WebGL | Plots render (solo mount) |
| dashboard01 KPI | Mid-glyph clip | Full labels/values + chart/table |
| safari URL | Center-clipped `"mph"` | Full `domphy.com` |
| bentoGrid mosaic | Skinny strips / CSS `undefined` | 3-col spans ≥64em |
| **solid warning vs primary** | Near-identical brown | Olive-green vs amber brown (dist ~59) |
| **solid error vs danger** | Same maroon | Rose vs scarlet (dist ~40) |
| **android / iphone / safari** | Empty black/white chrome | Default sample SVG screen content |
| **confetti** | Empty fixed canvas | `confettiButton` resting "Celebrate" CTA |
| **smoothCursor** | Invisible until pointer | In-flow resting arrow glyph |
| **scrollProgress** | 0-width empty bar | Resting `scaleX(0.42)` **only when no overflow**; real pages at scrollTop=0 show `scaleX(0)` |
| **spinningText** | 0×0 collapsed host | Explicit `ch` box + visible ring |
| **terminal** | Mid-type blank | Full text at rest; **retypes on start**; reduced-motion keeps rest |

## Color probe (Playwright computed, light catalog)

```
primary solid:  rgb(80, 32, 0)     brown
warning solid:  rgb(29, 62, 0)     olive
error solid:    rgb(107, 0, 49)    rose
danger solid:   rgb(102, 0, 9)     scarlet
primary↔warning distance: ~59  PASS (>40)
error↔danger distance:    ~40  PASS (>25)
```

Evidence: scratch `color-probe.json` + `shots-fix/button-solid-*.png`.

## Product / harness changes (this pass)

- `apps/web/site-theme.ts` — distinct `warning` / `danger` / `error` brand anchors
- `packages/theme/src/light.ts` — built-in `danger` ramp no longer clones `error`
- Device mocks — `DEFAULT_*_SCREEN_SRC` SVG data URIs when no `src`/`imageSrc`
- Effects resting UI — confetti demo → button; smoothCursor rest glyph; scrollProgress floor; spinningText box; terminal full-text rest
- Visual harness — solo capture, isolation, import map (prior commits)

## Intentionally deferred

| Item | Reason |
| --- | --- |
| Disabled control contrast ~1.7–2.9:1 | Dim disabled recipe by design (plan non-goal) |
| Full `catalog.spec.ts-snapshots` re-baseline | Scratch reshoot is evidence; promote on CI if desired |
| Every chart `*Legend` / `*Icons` variant chrome | Demo data gaps, not the listed open blockers |
| `orbitingCircles` frozen to center logo | Motion freeze; not in acceptance list |
| Full dark-theme human pixel pass of all 375 cells | Automated dark shoot exists; light was gating |

## Tests (shipped)

- `@domphy/theme` — solid-depth primary/warning + error/danger distance; light error≠danger
- `@domphy/blocks` — device default `img` data URI; spinningText box size; smoothCursor rest; scrollProgress resting scale; terminal full resting text
