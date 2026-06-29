<script setup lang="ts">

import LinkButton from "../../demos/patches/LinkButton.ts?raw"

</script>

# Link Button

Use `linkButton` on an `<a>` element to give it the visual appearance of a button while preserving full link semantics — `href`, middle-click to open in new tab, right-click context menu, and browser history.

Identical styling to `button()`, but the host element must be `<a>`. A console warning fires if applied to any other tag.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"primary"` | Button color tone. Reactive — pass a `State<ThemeColor>` to switch theme at runtime. |

## Usage

```ts
import { linkButton } from "@domphy/ui"

{ a: "Open app", href: "/app", $: [linkButton()] }

{ a: "Settings", href: "/settings", $: [linkButton({ color: "neutral" })] }
```

For a button that triggers JavaScript (no URL), use `button()` instead. `linkButton` is for navigational actions that should be a real anchor.

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/linkButton.ts [linkButton]
:::


