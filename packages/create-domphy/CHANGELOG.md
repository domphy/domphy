# create-domphy Changelog

## 0.18.8

- Pin scaffolded `@domphy/core` / `theme` / `ui` to 0.21.2 / 0.22.1 / 0.21.2.
- Scaffold write/rollback audit-fix pass.

## 0.18.7

- Pin scaffolded `@domphy/core` / `theme` / `ui` to the current sibling versions (0.21.1 / 0.22.0 / 0.21.1).
- Rollback after a mid-scaffold write failure now removes directories this run created (not just files), so a leftover `src/` cannot block retry.
- An existing `.gitignore` is left untouched instead of being overwritten.
- Package README documents `applySystemTheme()`; scaffolded `AGENTS.md` includes the string-is-TEXT rule and the `@domphy/doctor` self-check.
- Tests bundle via `build:bundle` (tsup only) so they no longer regenerate `versions.generated.ts`.

## 0.18.6

- Pin scaffolded `@domphy/ui` to 0.20.12.

## 0.18.5

- Pin scaffolded `@domphy/ui` to 0.20.11 (interactive a11y matrix release).

## 0.18.4

- P0 fix: scaffolded `main.ts` now calls `applySystemTheme()` after `themeApply()` — previously no theme scope was activated, so the starter rendered unstyled (bare text, invisible buttons) on first `npm run dev`. Regression test added.
- `index.html` ships a system font stack (the theme deliberately doesn't own one).
- Demo primary action uses `variant: "solid"`; scaffolded AGENTS.md mounting snippet + tone aliases synced.

## 0.18.3

- Scaffold pins `@domphy/core` / `theme` / `ui` versions independently via generated constants.
- Regression tests guard against `^latest` and version drift.

## 0.18.0

- Initial `npm create domphy@latest` scaffolder.

