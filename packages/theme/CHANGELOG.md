# @domphy/theme Changelog

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
