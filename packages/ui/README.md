# @domphy/ui

~60 ready-to-use patches for Domphy — buttons, inputs, dialogs, tooltips, tabs, and more. Includes `@domphy/core` and `@domphy/theme`.

```bash
npm install @domphy/ui
```

## What is a Patch?

A Patch is a function that returns a partial element descriptor. It augments a native HTML element without wrapping or owning it. The element's own properties always win.

```ts
import { ElementNode } from "@domphy/core"
import { themeApply } from "@domphy/theme"
import { button, tooltip, tabs } from "@domphy/ui"

themeApply()

const App = {
  div: [
    {
      button: "Save",
      $: [button(), tooltip({ content: "Save changes" })]
    }
  ],
  dataTheme: "light"
}

new ElementNode(App).render(document.body)
```

## Customization via ownership

Every patch ships as readable source. To fully customize, copy the patch into your project and modify it directly — no configuration API to work around.

```ts
import { toState, merge } from "@domphy/core"
import { themeColor, themeSpacing, themeSize } from "@domphy/theme"

// your own patch — full control
function myButton() {
  return (base) => merge(base, {
    style: {
      fontSize:        (l) => themeSize(l, "inherit"),
      padding:         `${themeSpacing(1)} ${themeSpacing(3)}`,
      borderRadius:    themeSpacing(2),
      backgroundColor: (l) => themeColor(l, "inherit", "primary"),
      color:           (l) => themeColor(l, "shift-6", "primary"),
      "&:hover": {
        backgroundColor: (l) => themeColor(l, "increase-1", "primary"),
      },
    }
  })
}
```

## CDN

```html
<script src="https://unpkg.com/@domphy/ui/dist/core-theme-ui.global.js"></script>
<script>
  const { core, theme, ui } = Domphy
</script>
```

---

**[Full documentation →](https://www.domphy.com/docs/ui/)**
