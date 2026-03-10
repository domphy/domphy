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

## Examples

- [i18next](/docs/integrations/i18next) — internationalization
- [TanStack Query](/docs/integrations/tanstack-query) — async data fetching and caching
- [SortableJS](/docs/integrations/sortablejs) — drag-and-drop list reordering
- [Zod](/docs/integrations/zod) — form validation
- [page.js](/docs/integrations/pagejs) — client-side routing

