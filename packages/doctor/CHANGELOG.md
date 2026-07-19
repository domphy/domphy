# @domphy/doctor

## 0.18.15

- `htmlhint`/`stylelint` moved from hard `dependencies` to optional `peerDependencies` (kept as devDependencies for the repo's own tests) — `auditOutput` already imports them lazily and silently returns `[]` when absent, so installing the CLI no longer drags in stylelint unless Layer 4 is actually used. Matches the long-documented "optional peer deps" contract.

## 0.18.14

- `unknown-tone` and `middle-surface-anchor` now accept @domphy/theme's semantic tone aliases (`surface`, `hover`, `border`, `border-strong`, `muted`, `text`) as valid `dataTone` grammar — they resolve to their underlying `shift-N` before grammar/range checks, so `dataTone: "border-strong"` is treated identically to `dataTone: "shift-4"`.

## 0.18.1

- Add built-in rule `tone-background-inherit`: warns when `style.backgroundColor` resolves to a fixed shifted tone (var(--X-N) with N > 0) at base context instead of `themeColor(l, "inherit")`. Detected by running the reactive function with a no-op listener. Use `dataTone` on the container to shift the surface tone instead of hardcoding a tone in `backgroundColor`.

## 0.9.0

- Initial release: `diagnose(element)` static analyzer for Domphy element trees — flags inline typography, void-tag content, missing `_key` on dynamic lists, and unknown tags. `format()` for readable reports.
