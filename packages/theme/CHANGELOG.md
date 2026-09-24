# @domphy/theme Changelog

## 0.23.1

- Republish of 0.23.0 with no code change: the 0.23.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.23.0 is deprecated on npm.

## 0.23.0

- **`generateRamp`/`generateTheme` now guarantee WCAG AA contrast for any hue.** Single-anchor ramp lightness is sampled at a closed-form luminance ladder (`Y + 0.05` geometric, `r = 21^(-1/(N-1))`) instead of taken from the Oklab warp, so every pair 9 steps apart contrasts at 5.01:1 and every pair 8 apart at 4.19:1 — `K_ideal = 9` is now exact for every base color. A 4096-color sweep of the sRGB cube previously failed the AA contract for 22.78% of ramps (worst 3.22:1 at `#00ff00`); it is now 0%. Hue and chroma still follow the warp curve, and base-color fidelity improved as a side effect (max ΔE2000 from the input hex to its nearest step, over a 12-anchor set: 2.70 → 2.28). **Generated ramp hex values change** — regenerate any theme baked from `generateTheme`. Multi-anchor ramps keep the previous warp-only sampling (pinned waypoints fix those steps' luminance) and carry no contrast guarantee.
- **`generateRamp` now solves a CONSTRAINED luminance ladder instead of sampling the closed-form one directly, closing both the anchor-fidelity gap above and the multi-anchor guarantee gap.** `solveConstrainedLadder()` (`Generator.ts`) finds the luminance sequence closest (in log-contrast space) to the closed-form ladder that still satisfies strict monotonicity, the near-white/near-black edges, and the K=9 AA floor on every pair — via Dykstra's alternating-projection algorithm (closed-form halfspace projections, no external QP dependency) — while pulling each anchor toward its OWN real luminance at its nearest step. A single anchor's pin is a soft preference (the solve never violates the AA guarantee to honor it, so `generateTheme()` never throws); 2+ anchors are pinned exactly, since the caller is asserting precise waypoints, and an incompatible placement (monotonic-order conflict, or two pinned steps closer together than a full K-step AA window allows) throws naming the offending pair instead of silently breaking the pin or the guarantee. Net effect: multi-anchor ramps now clear the SAME WCAG AA guarantee single-anchor ramps do (4096-color sweep: 0% failures, multi-anchor included), and anchor fidelity improves further on top of the ladder-only fix above (12-anchor set max ΔE2000: 2.28 → 1.16, most anchors round-trip their exact input hex). `Ramp.ts` exports `CONTRAST_EFFICIENCY_LAMBDA` (was a private literal) as the single source of truth for `K_ideal`, shared with the generator.
- **`themeCSS()` now emits the `light` theme on `:root`**, not only on `[data-theme="light"]`. A page that never set `data-theme` anywhere on the ancestor chain previously resolved every `var(--…)` to nothing and rendered unstyled with no error — text fell back to `rgb(0,0,0)`, backgrounds to transparent, `color-scheme` stayed `normal`. This hit every `@domphy/app` SSR page (its shell sets no `data-theme`) and `create-domphy`'s scaffolded `index.html` before `applySystemTheme()` ran on the client. `:root` and `[data-theme="…"]` have identical specificity and the `light` block is emitted first, so a `data-theme` anywhere still wins exactly as before — pages that already set the attribute are byte-for-byte unchanged.
- **`setTheme("light", …)` now re-derives the built-in `"dark"` theme.** Previously `"dark"` was snapshotted once at module init, so a brand palette applied to `"light"` left dark mode on the stock blue ramp, and a color role registered on `"light"` was missing from `"dark"` entirely (`themeColor()` threw there). Explicit `setTheme("dark", …)` overrides are recorded and replayed on top of each rebuild, in any call order — they are therefore *sticky*: a dark override keeps winning over every later light-derived value until it is overwritten.
- **`themeCSS()` emits `color-scheme` per theme block**, derived from the theme's `direction`. Native scrollbars, `<select>`, `<input type="date">` and range tracks now follow the theme instead of rendering light chrome on a dark page.
- **`applySystemTheme()` survives blocked storage.** Reading `localStorage` throws `SecurityError` in a sandboxed `<iframe>` without `allow-same-origin`, with third-party cookies blocked, or in Safari private mode — it now falls back to the OS preference instead of taking app startup down with it.
- **feat:** `resolveToneStep({ theme?, surface?, tone?, color? })` — resolves the ramp INDEX a tone lands on for a known `dataTone` surface, off-DOM, with the theme's edge `darkBias` applied. `resolveThemeColor()` gains the same `surface` option. `themeColor`, `themeColorToken`, `resolveThemeColor` and `resolveToneStep` now share one internal tone-arithmetic function, so an off-DOM resolution can never drift from what paint time produces.
- **feat:** the theme now owns the document font stack — `fontFamilies` tokens (`--fontFamily-sans-serif`, `--fontFamily-monospace`) ship with every theme and are declared on the themed root (a page whose only styling is `themeApply()` previously rendered in the UA serif). `themeFont(family?)` opts a code block/terminal out. New `themeWeight(weight?)` / `themeLetterSpacing(spacing?)` token groups (`fontWeights` light 300…black 900, `letterSpacings` tighter -0.05em…widest 0.1em), overridable per theme via `setTheme`. New exports `FONT_FAMILIES`/`FONT_WEIGHTS`/`LETTER_SPACINGS` and types `FontFamily`/`FontWeight`/`LetterSpacing`.
- `textToneOn()` no longer emits an off-ramp tone: a fill deeper than `TONE_STEPS - 1 - CONTRAST_SPAN` now gets a LIGHTER label (`textToneOn(12)` → `shift-3`) instead of the invalid `shift-21`. Input is clamped to a real ramp step.
- `createDark` no longer produces `NaN` base tones for a color role registered without a `baseTones` entry; `themeColor(l, "base", role)` raises the documented actionable error instead of returning `undefined`.
- `PartialThemeInput` no longer types ramps as `(string | undefined)[]` — a partial theme may omit a ramp, never hand one over with holes.
- The package's own `tsconfig.json` now type-checks standalone (`tsc --noEmit` previously failed with TS2550 while tsup's DTS build passed). Emitted syntax and runtime behavior are unchanged.

## 0.22.3

- `themeFluidSpacing` preferred value is Utopia-style (em→px at 16px/em) so `(4, 16)` is 1em at 320px and 4em at 1280px instead of clamping at 1em.
- `applySystemTheme({ persist })` is caller-writes: it honours an existing `"light"`/`"dark"` localStorage value and never writes one.
- `generateTheme` JSDoc merge example uses `getTheme("light")`.

## 0.22.2

- APCA `Bl` uses `Math.SQRT2` (was the `1.414` literal); chroma-peak index via `indexOf`.

## 0.22.1

- Palette engine / tone validation audit-fix pass (`Generator`, `Ramp`, `Swatch`, utils, actionable `themeVars` errors).

## 0.22.0
- Absorbed the `@domphy/palette` package: the palette engine (`Ramp`/`Palette`/`Swatch`, `generateRamp`, `isValidHex`/`normalizeHex`, and the color-space utilities) now lives in `src/palette/` and is re-exported as plain named exports from the main entry — no new subpath. `import { generateRamp } from "@domphy/theme"`.

## 0.20.1
- Metadata only: fuller package description/keywords for npm. No runtime change.

## 0.20.0
- Add semantic tone aliases (`surface`, `hover`, `border`, `border-strong`, `muted`, `text`) — sugar over the existing `shift-N` machinery in `themeColor`/`themeColorToken`/`dataTone`, so intent can be written instead of raw ramp indices. Additive only, existing `shift-N`/`increase-N`/`decrease-N`/`base`/`inherit` behavior is unchanged.

## 0.1.4
- Initial release
## 0.1.6
- add themeColorToken
## 0.1.10
- use chromametry palette
## 0.1.12
- big change - reactive dataTheme for darkBias
