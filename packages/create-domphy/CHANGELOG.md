# create-domphy Changelog

## 0.18.4

- P0 fix: scaffolded `main.ts` now calls `applySystemTheme()` after `themeApply()` — previously no theme scope was activated, so the starter rendered unstyled (bare text, invisible buttons) on first `npm run dev`. Regression test added.
- `index.html` ships a system font stack (the theme deliberately doesn't own one).
- Demo primary action uses `variant: "solid"`; scaffolded AGENTS.md mounting snippet + tone aliases synced.

## 0.18.3

- Scaffold pins `@domphy/core` / `theme` / `ui` versions independently via generated constants.
- Regression tests guard against `^latest` and version drift.

## 0.18.0

- Initial `npm create domphy@latest` scaffolder.
