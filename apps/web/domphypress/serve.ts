// Minimal static file server for DomphyPress output. Resolves clean URLs
// (`/docs/core/syntax` -> `docs/core/syntax/index.html`) and serves a 404 page.
// Used by the `preview` script and by the dev server.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize } from "node:path";

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
};

/** Resolves a request path to an on-disk file, applying clean-URL rules. */
function resolveFile(root: string, urlPath: string): string | null {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  // Prevent path traversal outside the root.
  const safe = normalize(clean).replace(/^(\.\.[/\\])+/, "");
  const candidates: string[] = [];
  if (extname(safe)) {
    candidates.push(join(root, safe));
  } else {
    candidates.push(join(root, safe, "index.html"));
    candidates.push(join(root, `${safe}.html`));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Starts a static server for `root` on `port`. Returns the http.Server. */
export function startServer(root: string, port: number): Server {
  const server = createServer((request, response) => {
    const file = resolveFile(root, request.url ?? "/");
    if (!file) {
      const notFound = join(root, "404.html");
      response.statusCode = 404;
      response.setHeader("content-type", "text/html; charset=utf-8");
      if (existsSync(notFound)) {
        createReadStream(notFound).pipe(response);
      } else {
        response.end("404 Not Found");
      }
      return;
    }
    response.statusCode = 200;
    response.setHeader(
      "content-type",
      MIME[extname(file)] ?? "application/octet-stream",
    );
    createReadStream(file).pipe(response);
  });
  server.listen(port, () => {
    console.log(`DomphyPress serving ${root}\n  http://localhost:${port}/`);
  });
  return server;
}

// CLI entry: `tsx serve.ts [port]` serves the build output.
if (process.argv[1]?.endsWith("serve.ts")) {
  const { dirname, resolve } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const root = resolve(here, "..", ".vitepress", "dist");
  const port = Number(process.argv[2]) || 4173;
  if (!existsSync(root)) {
    console.error(`No build at ${root}. Run "pnpm build" first.`);
    process.exit(1);
  }
  startServer(root, port);
}
