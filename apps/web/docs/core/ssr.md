# SSR

Domphy uses the same element definition for CSR and SSR — no duplicate templates.

## Client Render

```ts
new ElementNode(App).render(document.body)
```

Call `render()` once at the app root for client-side rendering.

## Server-Side Rendering

<img alt="SSR" src="/figures/ssr.png" style="display:block;margin:auto" />

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

new ElementNode(App).mount(document.getElementById("app")!, domStyle)
```
:::

For SSR, render CSS into `<style id="domphy-style">` on the server and pass that same style element to `mount()` on the client.

`mount()` binds to existing DOM — attaches reactivity and events without re-rendering.
