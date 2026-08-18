# @domphy/virtual

## Unreleased

- `createVirtualizer.setOptions` no longer calls `measure()` on every update, so a count-only change (infinite-scroll append) keeps `itemSizeCache`. Call `virtualizer.measure()` to force a full remeasure.

## 0.18.2

- `createWindowVirtualizer` — typed window-scroll factory at `@domphy/virtual/domphy` (`TScroll` fixed to `Window`; `observeWindowRect` / `observeWindowOffset` / `windowScroll` defaults; no `as any`).

## 0.6.0

- Initial release: 1-1 port of @tanstack/virtual-core v3.17.0, plus a Domphy adapter (`createVirtualizer`) at the `@domphy/virtual/domphy` subpath.
