# @domphy/theme Changelog

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
