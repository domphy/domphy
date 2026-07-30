import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startDevServer, startServer } from "../src/serve.ts";

let root: string;
let server: Server | undefined;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "press-serve-"));
  writeFileSync(join(root, "index.html"), "<html><body>home</body></html>");
  writeFileSync(join(root, "404.html"), "<html><body>not found</body></html>");
  mkdirSync(join(root, "guide"));
  writeFileSync(
    join(root, "guide", "index.html"),
    "<html><body>guide</body></html>",
  );
});

afterEach(async () => {
  if (server?.listening) {
    server.close();
    await once(server, "close");
  }
  server = undefined;
  rmSync(root, { recursive: true, force: true });
});

async function listen(instance: Server): Promise<string> {
  await once(instance, "listening");
  const { port } = instance.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("startServer", () => {
  it("serves files with clean URLs", async () => {
    server = startServer(root, 0);
    const base = await listen(server);
    const response = await fetch(`${base}/guide`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("guide");
  });

  it("answers a malformed URL with 400 and keeps serving", async () => {
    server = startServer(root, 0);
    const base = await listen(server);
    // decodeURIComponent("%zz") throws URIError — previously this crashed
    // the whole process.
    expect((await fetch(`${base}/%zz`)).status).toBe(400);
    // The server survived:
    expect((await fetch(`${base}/`)).status).toBe(200);
  });

  it("serves the themed 404.html for missing pages", async () => {
    server = startServer(root, 0);
    const base = await listen(server);
    const response = await fetch(`${base}/no-such-page`);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("not found");
  });
});

describe("startDevServer", () => {
  it("injects the live-reload script into html and survives malformed URLs", async () => {
    const dev = startDevServer(root, 0);
    server = dev.server;
    const base = await listen(server);
    const html = await (await fetch(`${base}/`)).text();
    expect(html).toContain("EventSource");
    expect((await fetch(`${base}/%zz`)).status).toBe(400);
    expect((await fetch(`${base}/`)).status).toBe(200);
  });
});
