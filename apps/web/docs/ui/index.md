<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Overview from "../demos/ui/Overview.ts?raw"
</script>

# UI

`@domphy/ui` is the official patch library for Domphy.

It provides ready-made patches for common native elements such as buttons, dialogs, menus, tabs, inputs, and typography primitives.

A patch does not create a new element. It merges styles, attributes, hooks, and behavior into an existing element.

<CodeEditor :code="Overview" />

```ts
import { button, tooltip } from "@domphy/ui"

const submitButton = {
  button: "Submit",
  $: [
    button({ color: "primary" }),
    tooltip({ content: "Submit the form" }),
  ],
}
```

## What UI Adds

`@domphy/ui` sits on top of `@domphy/core` and `@domphy/theme`.

- `@domphy/core` provides the object model, rendering, and lifecycle
- `@domphy/theme` provides tone, size, and spacing helpers
- `@domphy/ui` packages those pieces into reusable patches

Most patches are:

- native-element first
- context-aware with `dataTone` and `dataSize`
- small in prop surface
- customizable without rewriting the whole patch

## Read Next

1. [Color And Tone](./color) for practical `role / tone / color` choices in the UI layer
2. [Dimension](./dimension) for sizing rules and patch size families
3. [Customization](./customization) for how to override and adapt existing patches
4. [Creation](./creation) for writing new patches correctly
5. [Patches](./patches/button) when you want the catalog

If you already know the system and just want a component, jump straight to the `Patches` group in the sidebar.
