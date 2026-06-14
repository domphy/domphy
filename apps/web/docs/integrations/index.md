# Integrations

Domphy works with most JavaScript/TypeScript libraries because it keeps a strict boundary:

- UI is just declarative element objects rendered by `ElementNode`.
- Reactivity is subscription-based (`listener`) and can be connected to any external store/event source.
- State architecture is not owned by Domphy.

See related references:

- [Core Guide](/docs/core/)
- [State API](/docs/core/api/state)
- [ElementNode API](/docs/core/api/element-node)

## Why It Works With Most JS/TS Libraries

Domphy does not force a global app model, router model, or data cache model.  
If a library can notify changes, it can drive Domphy UI.

```ts
// External store -> Domphy listener
store.subscribe(() => listener())

// External stream -> Domphy listener
stream.subscribe(() => listener())
```

This keeps integration simple: use your preferred state architecture, and only bridge updates at the view edge.

## Boundary Rule: Data and UI Must Stay Separate

Domphy does **not** encourage "plugin islands" for framework-level behavior, especially plugins that combine data/state orchestration with UI behavior.

Why:

- It increases abstraction layers with little practical value.
- It blurs the boundary between data flow and presentation.
- It makes long-term maintenance harder, especially across teams.

The author previously built plugin-style integrations (including query/router wrappers), then removed them for this reason: the wrappers added abstraction but reduced clarity around ownership of data vs UI.

## Recommended Integration Pattern

1. Keep data/state in the external library (query client, router, store, stream, etc.).
2. Convert only the minimum needed signals into Domphy-reactive reads at render points.
3. Keep patch/component code focused on presentation and interaction.

## Domphy package, or vanilla?

Domphy ships first-party packages only for the cores that benefit from a tight Domphy-reactivity adapter. **Everything else you use vanilla, directly** — there is intentionally no `@domphy/chart`, `@domphy/i18n`, `@domphy/editor`, etc. Domphy is *better* at this than React: lifecycle hooks (`_onMount`/`_onRemove`) integrate imperative DOM libraries cleanly, with no virtual DOM fighting them.

| Need | Use |
| --- | --- |
| async data / tables / routing / virtualization / forms | `@domphy/query` · `@domphy/table` · `@domphy/router` · `@domphy/virtual` · `@domphy/form` (1-1 TanStack ports + adapter) |
| drag & drop | `@domphy/dnd` |
| animation | the `motion()` patch (`@domphy/ui`) |
| charts | **vanilla** Chart.js / ECharts / D3 |
| rich text | **vanilla** TipTap / ProseMirror / Lexical (framework-agnostic cores) |
| carousel | **vanilla** embla-carousel (its core is framework-agnostic) |
| i18n | **vanilla** i18next (core) — [recipe](/docs/integrations/i18next) |
| dates | **vanilla** dayjs / date-fns / flatpickr |
| schema validation | **vanilla** zod (works with `@domphy/form` via Standard Schema) — [recipe](/docs/integrations/zod) |
| maps / 3D | **vanilla** leaflet/maplibre · three.js |
| icons | any SVG string + the `icon()` patch (e.g. lucide icons) |

If a library has a framework-agnostic core (most do — the "React" version is usually a thin wrapper), use that core. No wrapper needed.

## DOM library pattern

The canonical way to mount any imperative DOM library:

```ts
{
  div: null, // the library's mount target
  _onMount: (node) => {
    const instance = new SomeLib(node.domElement, options)
    node.setMetadata("lib", instance)
  },
  _onRemove: (node) => {
    (node.getMetadata("lib") as SomeLib | undefined)?.destroy()
  },
}
```

When the library mutates the DOM itself (e.g. a drag-sort plugin reorders nodes), sync Domphy's logical tree **without re-touching the DOM** using `node.children.move(from, to, /* updateDom */ false)`. React can't do this — its virtual DOM must own the tree; Domphy keeps tree and DOM in sync independently.

## Examples

- [i18next](/docs/integrations/i18next) — internationalization
- [TanStack Query](/docs/integrations/tanstack-query) — async data fetching and caching
- [Chart.js](/docs/integrations/chartjs) — charts via `_onMount`
- [SortableJS](/docs/integrations/sortablejs) — drag-and-drop list reordering
- [Zod](/docs/integrations/zod) — form validation
- [page.js](/docs/integrations/pagejs) — client-side routing

