# @domphy/pages — PARKED

Not wired into the workspace build. `biome.json` excludes it. It is an idea
archive, kept whole so it can be revived without an archaeology dig. `pnpm
test` in this package runs the runtime sanitizer + pageElement suite.

## Provenance

Parked 2026-08-06 from the ParaShape `pages[]`-lane cut (see that repo's
`SCOPE.md` ledger). ParaShape deleted the lane — schema, validate, editor UI,
the runtime — because a live-screen/configurator lane was outside the scope
the product settled on. This is the runtime half, which is the part with reuse
value outside ParaShape: it is a generic JSON→DOM renderer on `@domphy/core`,
not CAD code.

## What it is

- **`src/pageElement.ts`** — the renderer. Takes a resolved `PageJSON` and
  produces a mountable Domphy element tree with fine-grained reactivity: one
  compiled AST per arg, one reactive function per `RecordState` key it
  reads (style leaves get their own bindings; tag/patches resolve once). Also
  exports `adoptGenerated` and `sanitizeUrl`, the sanitizer surface
  (`safeTag`→div, attribute whitelist skip, `sanitizeUrl` on href/src/poster,
  unknown method dropped, unknown object without a string `method` dropped —
  never passed through — generated `style` filtered through
  `PAGE_STYLE_PROPERTY_SET`). href rejects every `data:` URL (including
  `image/svg+xml`); src/poster still allow `data:image/*` for inline media.
- **`src/paramBridge.ts`** — `pageParamBridge`, re-runs the page's parameter
  resolution when a host model parameter changes.
- **`src/popover.ts`** — a Domphy patch wrapping `@floating-ui/dom`
  (placement/strategy/offset/flip/shift/hide/inline/autoUpdate, plus
  `arrow`/`size` for direct TypeScript callers). **Engine-free**: 386 lines
  importing nothing but `@domphy/core` and a lazy `import("@floating-ui/dom")`.
  Ported 1:1 from `@domphy/ui`'s popover with the theme stripped and the
  middleware order fixed — if `@domphy/ui` ever wants a themeless popover,
  this file is the ready-made one. It hardcodes the DOM id
  **`parashape-pages-floating`** for its overlay container; rename that before
  any use outside this archive.
- **`src/index.ts`** — the public surface.
- **`src/__tests__/`** — the runtime's own tests (jsdom).

## Engine coupling

`pageElement.ts` / `paramBridge.ts` import from **`engine/` in this package**,
not from `@parashape/parametric` (that package is not in this workspace).
`popover.ts` imports none of them.

Runnable local surface (`engine/index.ts`):
`createTableNamespace` · `encodeBase64` · `evaluate` · `interpretEventResult` ·
`isContainerJSON` · `PAGE_*_SET` (incl. `PAGE_STYLE_PROPERTY_SET`) · `parse` ·
`resolvePageParameters` · `StatsNamespace` · `ParameterNode` / `Model` · types
(`Expression` · `NodeJSON` · `OperationJSON` · `PageJSON` · `PageScope` ·
`ResolvedPagePopover`).

`evaluate`/`parse` are a self-contained recursive-descent stand-in for the
ParaShape jsep + arrow/object/ternary stack — same expression surface the
runtime tests need (literals, members, calls, arrows, object/array literals).

## `engine/` — the deleted engine side, verbatim

Snapshots taken from ParaShape `HEAD` at the moment of the cut. The live
runtime no longer imports them:

| file | was |
|---|---|
| `engine/pages.ts` | `packages/parametric/src/pages.ts` — `resolvePage`, `resolvePageParameters`, `interpretEventResult`, popover field resolution, the `PageScope` contract |
| `engine/pageVocabulary.ts` | `packages/parametric/src/schema/vocabulary/pageVocabulary.ts` — `PAGE_TAGS`/`EVENTS`/`ATTRIBUTES`/`STYLE_PROPERTIES`/`PATCHES` and their `*_SET`s |
| `engine/pageTypes.ts` | `packages/parametric/src/graph/page.ts` — `PageJSON`, `PageScope`, `ResolvedPagePopover`, `GeneratedPageNode` |
| `engine/pages.test.ts` | `packages/parametric/src/__tests__/pages.test.ts` |

These snapshots still import from the ParaShape engine's own internals and
will not typecheck standalone. The runnable replacements are `engine/index.ts`
and its siblings (`types.ts`, `expression.ts`, `runtime.ts`, `model.ts`).
