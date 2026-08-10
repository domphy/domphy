# @domphy/pages — PARKED

Not wired into the workspace build. No scripts, so `pnpm -r` sweeps are a
no-op here; `biome.json` excludes it. It is an idea archive, kept whole so it
can be revived without an archaeology dig.

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
  compiled jsep AST per arg, one reactive function per `RecordState` key it
  reads (style leaves get their own bindings; tag/patches resolve once). Also
  exports `adoptGenerated`, the ONE DOM consumer of a `children`-arg subtree —
  it is the whole sanitizer surface (`safeTag`→div, attribute whitelist skip,
  `sanitizeUrl`, unknown method dropped).
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

## Engine coupling — what it needs to run again

`pageElement.ts` / `paramBridge.ts` / `index.ts` import these from the
ParaShape engine (`@parashape/parametric`). Nothing else. `popover.ts` imports
none of them.

Values:
`createTableNamespace` · `encodeBase64` · `evaluate` · `interpretEventResult` ·
`isContainerJSON` · `PAGE_ATTRIBUTE_SET` · `PAGE_EVENT_SET` · `PAGE_PATCH_SET` ·
`PAGE_TAG_SET` · `parse` · `resolvePageParameters` · `StatsNamespace` ·
`ParameterNode` (runtime class).

Types:
`Expression` · `NodeJSON` · `OperationJSON` · `PageJSON` · `PageScope` ·
`ResolvedPagePopover` · `Model`.

**`evaluate`/`parse` are not bare jsep.** The engine configures jsep with the
arrow-function, object-literal and ternary plugins; a stock jsep parses the
same strings differently (or throws). Reviving this outside ParaShape means
porting that configured expression layer too, not swapping in `jsep`.

## `engine/` — the deleted engine side, verbatim

Snapshots taken from ParaShape `HEAD` at the moment of the cut, so the symbols
above have a reference implementation:

| file | was |
|---|---|
| `engine/pages.ts` | `packages/parametric/src/pages.ts` — `resolvePage`, `resolvePageParameters`, `interpretEventResult`, popover field resolution, the `PageScope` contract |
| `engine/pageVocabulary.ts` | `packages/parametric/src/schema/vocabulary/pageVocabulary.ts` — `PAGE_TAGS`/`EVENTS`/`ATTRIBUTES`/`STYLE_PROPERTIES`/`PATCHES` and their `*_SET`s |
| `engine/pageTypes.ts` | `packages/parametric/src/graph/page.ts` — `PageJSON`, `PageScope`, `ResolvedPagePopover`, `GeneratedPageNode` |
| `engine/pages.test.ts` | `packages/parametric/src/__tests__/pages.test.ts` |

These are snapshots, not a build target. They still import from the ParaShape
engine's own internals and will not typecheck standalone.
