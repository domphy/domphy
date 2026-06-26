<script setup lang="ts">

import ErrorBoundary from "../../demos/patches/ErrorBoundary.ts?raw"

</script>

# Error Boundary

Catches errors thrown inside reactive child expressions and renders a fallback element instead of crashing the whole tree. Apply to any container element.

Only errors in *reactive* children (functions returning element arrays) are caught. Errors during static construction propagate normally — those are programming errors, not runtime data errors.

<CodeEditor :code="ErrorBoundary" />

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fallback` | `DomphyElement \| ((error, reset) => DomphyElement)` | `{ div: "An error occurred." }` | Fallback element shown when a child throws. Pass a factory to receive the error and a `reset` callback. |
| `onError` | `(error: unknown) => void` | — | Optional callback invoked on every caught error, useful for logging and telemetry. |

## Basic fallback

Provide a static element as `fallback` for a simple message when you do not need to display the error or offer a retry:

```ts
{
  div: (l) => renderUserContent(l),
  $: [errorBoundary({ fallback: { p: "Something went wrong." } })],
}
```

## Factory fallback with reset

Pass a function to receive the thrown `error` and a `reset` callback. Calling `reset()` clears the boundary so the next reactive evaluation runs again:

```ts
{
  div: (l) => dataState.get(l).map(renderItem),
  $: [
    errorBoundary({
      fallback: (error, reset) => ({
        div: [
          { p: `Error: ${String(error)}` },
          { button: "Try again", onClick: reset },
        ],
      }),
    }),
  ],
}
```

## With error logging

Use `onError` to forward errors to your monitoring stack while still showing a friendly fallback:

```ts
{
  section: (l) => renderDashboard(l),
  $: [
    errorBoundary({
      fallback: { div: "Dashboard failed to load." },
      onError: (error) => reportToSentry(error),
    }),
  ],
}
```

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/errorBoundary.ts [errorBoundary]
:::
