# SSR

Domphy uses the same element definition for CSR and SSR — no duplicate templates.

## Client Render

```ts
new ElementNode(App).render(document.body)
```

Call `render()` once at the app root for client-side rendering.

## Server-Side Rendering

<img alt="SSR" src="/figures/ssr.png" style="display:block;margin:auto" />

`generateHTML()` emits the **root tag** (`<div class="div_…">…</div>` if `App` is `{ div: … }`). Hydrate by mounting onto that generated element, not onto a wrapper whose tag is not the root.

::: code-group
```ts [server.js]
import { ElementNode } from "@domphy/core"
import { themeCSS } from "@domphy/theme"
import App from "./app.js"

const node = new ElementNode(App)

const page = `<!DOCTYPE html>
<html>
  <head>
    <style id="domphy-style">${themeCSS()}${node.generateCSS()}</style>
  </head>
  <body>
    <div id="app">${node.generateHTML()}</div>
    <script type="module" src="/client.js"></script>
  </body>
</html>`
```

```ts [client.js]
import { ElementNode } from "@domphy/core"
import App from "./app.js"

const domStyle = document.getElementById("domphy-style") as HTMLStyleElement
const host = document.getElementById("app")!

new ElementNode(App).mount(host.firstElementChild as HTMLElement, domStyle)
```
:::

For SSR, render CSS into `<style id="domphy-style">` on the server and pass that same style element to `mount()` on the client.

`generateCSS()` emits the same runtime base rule (`[hidden] { display: none !important }`) the client injects on `render()`, so a server-rendered `hidden` element that also declares a `display` stays hidden before hydration instead of flashing.

`generateHTML()` doubles a leading newline inside `<pre>` and `<textarea>`: the HTML parser drops a single newline placed right after those start tags, so without the escape the server output would show `first` where the client's text node shows `\nfirst`.

`mount()` binds to existing DOM — attaches reactivity and events without re-rendering. Passing the wrapper `#app` (tag ≠ generated root) is a hydration mismatch.
