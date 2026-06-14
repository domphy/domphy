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

## Streaming

`renderToStream` trades the single `renderToString` string for a web `ReadableStream` that flushes in two phases: the **shell** (layouts wrapping each segment's `loading` fallback) goes out immediately for a fast first byte, then the resolved **content**, head and hydration data stream in once the loaders settle.

```ts
const { stream, status, redirect } = await app.renderToStream(request.url, {
  head: `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`,
  bootstrap: `<script type="module" src="/client.js"></script>`,
  headers: request.headers,
})

response.writeHead(status, { "content-type": "text/html" })
// Pipe the web stream to the Node response (or return it directly on edge runtimes).
for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
  response.write(chunk)
}
response.end()
```

`renderToStream` emits a full HTML document:

- **First flush** — `<!DOCTYPE html>` + `<head>` (your `head` option + shell CSS) + `<body><div id="domphy-app">` wrapping the shell. The browser paints the loading UI right away.
- **Second flush** — the content and head arrive as `<template>` elements followed by an inline script that swaps them into place, then the hydration data and your `bootstrap` markup.

`RenderToStreamOptions` adds `head` (markup for `<head>`, sent first) and `bootstrap` (markup before `</body>`, usually the client bundle `<script>`) to the `headers` option. Because the shell is committed before loaders run, `status` is `200` for any matched route; loader-level `notFound()`/`error` render their boundaries inline.

On the client, hydrate the swapped root exactly as with `renderToString`:

```ts
await app.hydrate(document.getElementById("domphy-app")!.firstElementChild as HTMLElement)
```

::: tip
Use `renderToString` when you want one buffered response (simplest, best for SSG and small pages) and `renderToStream` when slow loaders would otherwise delay the first byte — the shell paints instantly and content streams in.
:::

## Static Generation

`renderToString` is a pure function of URL + loaders, so SSG is a loop:

```ts
for (const url of ["/", "/about", "/blog/hello"]) {
  const result = await app.renderToString(url)
  await writePage(url, result)
}
```
