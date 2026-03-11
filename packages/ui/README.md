# @domphy/ui

Ready-made patches for Domphy.

`@domphy/ui` includes `@domphy/core` and `@domphy/theme`, and provides patches for buttons, inputs, dialogs, menus, tabs, tooltips, and more.

## Install

```bash
npm install @domphy/ui
```

## Quick Example

```ts
import { ElementNode } from "@domphy/core"
import { themeApply } from "@domphy/theme"
import { button, tooltip } from "@domphy/ui"

themeApply()

const App = {
  div: [
    {
      button: "Save",
      $: [
        button({ color: "primary" }),
        tooltip({ content: "Save changes" }),
      ],
    },
  ],
  dataTheme: "light",
}

new ElementNode(App).render(document.body)
```

## What A Patch Is

A patch returns a `PartialElement` and merges into a native element.

It does not create a wrapper component or own a separate DOM boundary.

```ts
{
  button: "Save",
  $: [button()],
}
```

## Customization

Most customization should happen in one of these ways:

1. pass patch props
2. use `dataTone` or `dataSize` context
3. override inline on the element
4. copy the patch into your app and create your own variant

## CDN

```html
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
<script>
  const { core, theme, ui } = Domphy
</script>
```

## Docs

- [UI guide](https://www.domphy.com/docs/ui/)
- [Customization](https://www.domphy.com/docs/ui/customization)
- [Creation](https://www.domphy.com/docs/ui/creation)
- [Patch catalog](https://www.domphy.com/docs/ui/patches/button)
