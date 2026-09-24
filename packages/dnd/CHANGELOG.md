# @domphy/dnd

## 0.19.1

- Republish of 0.19.0 with no code change: the 0.19.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.19.0 is deprecated on npm.

## 0.19.0

- `keyboardSort(state, options?)` / `keyboardSortGroup(states, options?)`: keyboard-operable reorder for a list the pointer engine cannot reach. Space/Enter picks up and drops, arrows move, Home/End jump to the ends, Escape restores the original order; left/right move between lists in a group. Items get `tabindex="0"`, `aria-roledescription`, `aria-describedby` instructions and `data-grabbed`, focus follows the moved item, and every step is announced through a visually-hidden `aria-live="assertive"` region. Closes the WCAG 2.2 SC 2.5.7 / SC 2.1.1 gap left by FormKit's empty `handleNodeKeydown` stub. SSR-safe (the live region is DOM-guarded).
- `keyboardSort`/`keyboardSortGroup` now call `scrollIntoView({ block: "nearest", inline: "nearest" })` after every move — a move that keeps the grabbed item's own DOM node in place (the common case: reconciliation moves the *neighbour*, not the held item) previously relied on the browser's implicit scroll-on-focus, which never fires when focus doesn't change and isn't guaranteed "nearest" inside a scrollable container even when it does.
- Fixed: two independent `keyboardSort()`/`keyboardSortGroup()` sessions on the same page could have their refocus-after-move logic match each other's grabbed item, since it queried the whole document for one shared boolean marker. Each session now carries its own id, used by an internal `data-grab-session` attribute the query is scoped to; the public `data-grabbed="true"` styling hook is unchanged.
- Real-Chromium (Playwright) coverage added: `e2e/keyboardSort.spec.ts` drives Tab/Space/Arrow/Escape against a live demo page — single-list reorder, cross-list transfer, live-region announcements, blur-commit, the two-session isolation above, and the autoscroll fix, all of which a jsdom test cannot exercise (no real focus/blur/scrollIntoView/layout). Run with `pnpm --filter @domphy/dnd test:e2e`.

## 0.18.6

- `dragDrop`/`multiList` migrated to `behavior()` — a factory re-run under a reactive parent re-binds the new State/config instead of staying on generation 1; rAF handles are cancelled; `tearDown` is guarded when registration never happened.
- SSR coverage: `dragDrop`/`multiList`/`multiListGroup` construct and `generateHTML()`/`generateCSS()` stay DOM-free (FormKit registration stays Mount-gated).
- `tearDownFully` disconnects FormKit's setup MutationObserver (upstream `tearDown()` leaves it running, so tearDown+rebind stacked observers). `destroy` disconnects.
- `getValues`/`setValues` bind live getters on the current `props` so a State swap is visible immediately, not after the deferred re-register.

## 0.7.0

- Initial release: Domphy adapter (`dragDrop`) for the framework-agnostic `@formkit/drag-and-drop` engine, plus a re-export of the engine itself.
