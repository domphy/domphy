# @domphy/virtual

## 0.18.4

- Resynced the vendored core to `@tanstack/virtual-core@3.17.11` (from 3.17.7). Upstream's `isAppendWithTrim` supersedes the one local deviation (the pure-append anchor fast path), so it was dropped and the port is byte-identical again. Fixes gained: the `isScrolling = false` reset queued by the last scroll is now cancelled on teardown instead of landing on a destroyed virtualizer (it reached the adapter's disposed version `State`); `cleanup()` resets `isScrolling`/`scrollDirection` so a scroll-element swap mid-reset no longer strands them; range guards on the resize observer / `measureElement` / `resizeItem` reject a stale `data-index` past `count`; a compensation write the browser clamped before the sizer grew is re-issued (#1258, #1266); anchor sync no longer cancels an in-flight smooth scroll; `followOnAppend` fires for windowed appends (trim at the front, append at the end).
- `dist/virtual.global.js` (the `unpkg`/`jsdelivr` entry) no longer throws `ReferenceError: process is not defined` on first use in a plain `<script>` tag — the iife build now inlines `process.env.NODE_ENV`.

## 0.18.3

- `createVirtualizer.setOptions` no longer calls `measure()` on every update, so a count-only change (infinite-scroll append) keeps `itemSizeCache`. Call `virtualizer.measure()` to force a full remeasure.

## 0.18.2

- `createWindowVirtualizer` — typed window-scroll factory at `@domphy/virtual/domphy` (`TScroll` fixed to `Window`; `observeWindowRect` / `observeWindowOffset` / `windowScroll` defaults; no `as any`).

## 0.6.0

- Initial release: 1-1 port of @tanstack/virtual-core v3.17.0, plus a Domphy adapter (`createVirtualizer`) at the `@domphy/virtual/domphy` subpath.
