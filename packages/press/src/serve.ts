// Static file server with clean-URL support (route → dir/index.html).

import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer, type Server } from "node:http"
import { extname, join, normalize } from "node:path"

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
}

function resolveFile(root: string, urlPath: string): string | null {
  const safe = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "")
  const candidates = extname(safe)
    ? [join(root, safe)]
    : [join(root, safe, "index.html"), join(root, `${safe}.html`)]
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

export function startServer(root: string, port: number): Server {
  const server = createServer((request, response) => {
    const file = resolveFile(root, request.url ?? "/")
    if (!file) {
      const notFound = join(root, "404.html")
      response.statusCode = 404
      response.setHeader("content-type", "text/html; charset=utf-8")
      if (existsSync(notFound)) createReadStream(notFound).pipe(response)
      else response.end("404 Not Found")
      return
    }
    response.statusCode = 200
    response.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream")
    createReadStream(file).pipe(response)
  })
  server.listen(port, () => {
    console.log(`DomphyPress serving ${root}\n  http://localhost:${port}/`)
  })
  return server
}
