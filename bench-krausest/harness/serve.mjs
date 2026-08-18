// Tiny static file server for the benchmark app. Shared by the timing
// harness and the profiler. Listens on 4190 (repo convention: avoids
// collisions with other playwright servers).

import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
};

export function serve(port = 4190) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const file = path.join(
        root,
        url.pathname === "/" ? "index.html" : url.pathname,
      );
      if (!file.startsWith(root)) throw new Error("forbidden");
      const body = await readFile(file);
      res.writeHead(200, {
        "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((resolve, reject) => {
    const onListenError = (err) => reject(err);
    server.once("error", onListenError);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", onListenError);
      server.on("error", (err) => {
        console.error("serve error:", err);
      });
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done, fail) => {
            server.close((closeErr) => (closeErr ? fail(closeErr) : done()));
          }),
      });
    });
  });
}
