// Static file server with clean-URL support.
// In dev mode: adds SSE endpoint /_dev/sse for live-reload.

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server, type ServerResponse } from "node:http";
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
  ".xml": "application/xml; charset=utf-8",
};

const DEV_SCRIPT = `<script>(function(){var es=new EventSource('/_dev/sse');es.onmessage=function(e){if(e.data==='reload')location.reload();};es.onerror=function(){setTimeout(function(){location.reload();},2000);};})();</script>`;

function resolveFile(root: string, urlPath: string): string | null {
  const safe = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  const candidates = extname(safe)
    ? [join(root, safe)]
    : [join(root, safe, "index.html"), join(root, `${safe}.html`)];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function startServer(root: string, port: number): Server {
  const server = createServer((request, response) => {
    const file = resolveFile(root, request.url ?? "/");
    if (!file) {
      const notFound = join(root, "404.html");
      response.statusCode = 404;
      response.setHeader("content-type", "text/html; charset=utf-8");
      if (existsSync(notFound)) createReadStream(notFound).pipe(response);
      else response.end("404 Not Found");
      return;
    }
    response.statusCode = 200;
    response.setHeader(
      "content-type",
      MIME[extname(file)] ?? "application/octet-stream",
    );
    createReadStream(file).pipe(response);
  });
  server.listen(port, () =>
    console.log(`DomphyPress preview: http://localhost:${port}/`),
  );
  return server;
}

export function startDevServer(
  root: string,
  port: number,
): { server: Server; notify: () => void } {
  const clients = new Set<ServerResponse>();

  const server = createServer((request, response) => {
    const url = request.url ?? "/";
    if (url === "/_dev/sse") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      response.write("data: connected\n\n");
      clients.add(response);
      request.on("close", () => clients.delete(response));
      return;
    }
    const file = resolveFile(root, url);
    if (!file) {
      response.statusCode = 404;
      response.setHeader("content-type", "text/html; charset=utf-8");
      const notFound = join(root, "404.html");
      if (existsSync(notFound)) createReadStream(notFound).pipe(response);
      else response.end("404 Not Found");
      return;
    }
    const mime = MIME[extname(file)] ?? "application/octet-stream";
    response.statusCode = 200;
    response.setHeader("content-type", mime);
    if (mime.startsWith("text/html")) {
      const html = readFileSync(file, "utf8");
      response.end(html.replace("</body>", `${DEV_SCRIPT}</body>`));
    } else {
      createReadStream(file).pipe(response);
    }
  });
  server.listen(port, () =>
    console.log(
      `DomphyPress dev: http://localhost:${port}/  (live reload active)`,
    ),
  );
  return {
    server,
    notify: () => {
      for (const client of clients) {
        try {
          client.write("data: reload\n\n");
        } catch {
          clients.delete(client);
        }
      }
    },
  };
}
