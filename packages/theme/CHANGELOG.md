# @domphy/theme Changelog

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
