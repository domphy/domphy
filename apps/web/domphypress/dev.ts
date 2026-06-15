// DomphyPress dev server: builds the site, serves it, and rebuilds on changes to
// the docs tree or the engine. A full rebuild per change (debounced) — simple and
// correct; incremental/HMR is a future enhancement.

import { watch } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite } from "./build.js";
import { startServer } from "./serve.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const dist = join(appRoot, ".vitepress", "dist");
const port = Number(process.env.PORT) || 5173;

let building = false;
let queued = false;
async function rebuild(): Promise<void> {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  const startedAt = Date.now();
  try {
    await buildSite();
    console.log(`Rebuilt in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error("Build failed:", error);
  }
  building = false;
  if (queued) {
    queued = false;
    void rebuild();
  }
}

await rebuild();
startServer(dist, port);

let debounce: ReturnType<typeof setTimeout> | undefined;
const onChange = (): void => {
  clearTimeout(debounce);
  debounce = setTimeout(() => void rebuild(), 300);
};
for (const dir of [join(appRoot, "docs"), here]) {
  watch(dir, { recursive: true }, onChange);
}
console.log("Watching docs/ and domphypress/ for changes…");
