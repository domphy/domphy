# @domphy/dnd

## 0.18.6

- `dragDrop`/`multiList` migrated to `behavior()` — a factory re-run under a reactive parent re-binds the new State/config instead of staying on generation 1; rAF handles are cancelled; `tearDown` is guarded when registration never happened.
- SSR coverage: `dragDrop`/`multiList`/`multiListGroup` construct and `generateHTML()`/`generateCSS()` stay DOM-free (FormKit registration stays Mount-gated).
- `tearDownFully` disconnects FormKit's setup MutationObserver (upstream `tearDown()` leaves it running, so tearDown+rebind stacked observers). `destroy` disconnects.
- `getValues`/`setValues` bind live getters on the current `props` so a State swap is visible immediately, not after the deferred re-register.

## 0.7.0

- Initial release: Domphy adapter (`dragDrop`) for the framework-agnostic `@formkit/drag-and-drop` engine, plus a re-export of the engine itself.
