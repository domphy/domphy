/**
 * Bundle + serve the standalone visual catalog for Playwright.
 *
 *   node visual/serve-standalone.mjs --port 4177
 *   open http://127.0.0.1:4177/?catalog=patches
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, ".serve");
const portArg = process.argv.indexOf("--port");
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : 4177);

mkdirSync(outDir, { recursive: true });

const html = readFileSync(join(here, "standalone.html"), "utf8").replace(
  "./standalone-entry.ts",
  "./standalone-entry.js",
);
writeFileSync(join(outDir, "index.html"), html, "utf8");

const ctx = await esbuild.context({
  entryPoints: [join(here, "standalone-entry.ts")],
  bundle: true,
  format: "esm",
  outdir: outDir,
  entryNames: "standalone-entry",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  // Avoid dual @domphy/* copies from tsconfig paths.
  tsconfigRaw: "{}",
  loader: {
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
    ".svg": "file",
    ".png": "file",
  },
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "warning",
});

await ctx.rebuild();
const server = await ctx.serve({ servedir: outDir, port });

console.log(
  `Visual catalog http://${server.host === "0.0.0.0" ? "127.0.0.1" : server.host}:${server.port}/?catalog=patches`,
);

process.on("SIGINT", async () => {
  await ctx.dispose();
  process.exit(0);
});
