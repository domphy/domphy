# Customization

Most UI work should start here, not in patch creation.

The goal is to adapt an existing patch before introducing a new one. Patches are intentionally small and merge into native elements, so many variations can be handled without forking the component model.

!!!include(snippets/customization.md)!!!

## Typical Example

```ts
import { button } from "@domphy/ui"

const action = {
  button: "Save",
  $: [button({ color: "primary" })],
  style: {
    width: "100%",
  },
}
```

This keeps the patch behavior and design defaults, while still letting the element override specific properties inline.

## When To Stop Customizing

Create a new patch only when:

- the variation is reused often
- the variation needs its own stable prop API
- inline overrides would make call sites noisy

If it is still one-off or local to a feature, keep it as a normal element with a patch plus inline overrides.
