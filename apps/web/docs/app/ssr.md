# Server Rendering

`@domphy/app` server-renders through Domphy core's `generateHTML()`/`generateCSS()` and hydrates with `mount()` — with routing, loaders, middleware and metadata handled for you.

## renderToString

```ts
const app = createApp(routes)
const result = await app.renderToString(request.url, { headers: request.headers })
```

`SSRResult`:

| Field | Meaning |
| --- | --- |
| `html` | markup of the app root |
| `css` | scoped CSS of the rendered tree |
| `head` | serialized `<title>` / `<meta>` / `<link>` tags |
| `status` | `200`, `404`, or `307`/`308` for redirects |
| `redirect` | redirect target, when a loader/middleware redirected |
| `data` | loader results, keyed for hydration |
| `bootstrapScript` | inline `<script>` exposing `data` to the client |

## A Node Server

```ts
import http from "node:http"
import { createApp } from "@domphy/app"
import { themeCSS } from "@domphy/theme"
import { routes } from "./routes.js"

http.createServer(async (request, response) => {
  const app = createApp(routes)
  const result = await app.renderToString(`http://localhost${request.url}`)

  if (result.redirect) {
    response.writeHead(result.status, { location: result.redirect })
    response.end()
    return
  }

  response.writeHead(result.status, { "content-type": "text/html; charset=utf-8" })
  response.end(`<!doctype html>
<html>
<head>
${result.head}
<style>${themeCSS()}</style>
<style id="domphy-style">${result.css}</style>
</head>
<body>
<div id="app">${result.html}</div>
${result.bootstrapScript}
<script type="module" src="/client.js"></script>
</body>
</html>`)
}).listen(3000)
```

## Hydration

`client.js` builds the same app and mounts onto the server markup. `hydrate()` reads the data embedded by `bootstrapScript`, so loaders are **not** re-run and the client tree matches the HTML byte for byte:

```ts
import { createApp } from "@domphy/app"
import { themeApply } from "@domphy/theme"
import { routes } from "./routes.js"

themeApply()

const app = createApp(routes)
const mountTarget = document.getElementById("app")!.firstElementChild as HTMLElement
const style = document.getElementById("domphy-style") as HTMLStyleElement
await app.hydrate(mountTarget, style)
```

After hydration the router takes over: clicks on `navLink` anchors navigate client-side, loaders run on demand, metadata updates `document.head`.

## Static Generation

`renderToString` is a pure function of URL + loaders, so SSG is a loop:

```ts
for (const url of ["/", "/about", "/blog/hello"]) {
  const result = await app.renderToString(url)
  await writePage(url, result)
}
```
