#!/usr/bin/env node
// domphy-press CLI: build | dev | preview

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig, parseFlags, parsePort, watchTree } from "./cli-utils.js";
import { defineConfig } from "./config.js";
import type { SiteConfig } from "./types.js";

const args = process.argv.slice(2);
const command = args[0];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function flagsFor(known: string[]): Record<string, string | undefined> {
  const { flags, unknown } = parseFlags(args.slice(1), known);
  for (const flag of unknown) console.warn(`Unknown flag: ${flag}`);
  return flags;
}

// Run the loaded config through defineConfig so plain-object configs get the
// same defaults (base, head, themeConfig) as configs that call it themselves
// — it is idempotent.
async function resolveConfig(configFile: string): Promise<SiteConfig> {
  const loaded = await loadConfig(configFile);
  return defineConfig(loaded as Parameters<typeof defineConfig>[0]);
}

if (command === "build") {
  const flags = flagsFor(["--config", "--src", "--out"]);
  let config: SiteConfig;
  try {
    config = await resolveConfig(flags["--config"] ?? "press.config.ts");
  } catch (error) {
    fail((error as Error).message);
  }
  const srcDir = resolve(process.cwd(), flags["--src"] ?? config.srcDir);
  const outDir = resolve(process.cwd(), flags["--out"] ?? config.outDir);
  const publicDir = resolve(process.cwd(), "public");
  const { buildSite } = await import("./build.js");
  try {
    await buildSite({
      config,
      srcDir,
      outDir,
      publicDir: existsSync(publicDir) ? publicDir : undefined,
    });
  } catch (error) {
    // Page render failures land here as one summarized error — print it
    // cleanly (no stack) and exit non-zero so CI/deploys notice.
    fail((error as Error).message || String(error));
  }
} else if (command === "dev") {
  const flags = flagsFor(["--config", "--src", "--out", "--port"]);
  let port: number;
  let config: SiteConfig;
  try {
    port = parsePort(flags["--port"], 3000);
    config = await resolveConfig(flags["--config"] ?? "press.config.ts");
  } catch (error) {
    fail((error as Error).message);
  }
  const srcDir = resolve(process.cwd(), flags["--src"] ?? config.srcDir);
  const outDir = resolve(process.cwd(), flags["--out"] ?? ".press-dev");
  const publicDir = resolve(process.cwd(), "public");
  const { buildSite } = await import("./build.js");
  const { startDevServer } = await import("./serve.js");

  async function buildOnce(): Promise<void> {
    const start = Date.now();
    try {
      await buildSite({
        config,
        srcDir,
        outDir,
        publicDir: existsSync(publicDir) ? publicDir : undefined,
        incremental: true,
      });
      console.log(`Rebuilt in ${Date.now() - start}ms`);
    } catch (error) {
      console.error("Build error:", (error as Error).message || error);
    }
  }

  // Serialize rebuilds: a change landing mid-build sets `queued` and is
  // folded into one follow-up run — never two concurrent buildSite calls on
  // the same outDir/cache.
  let notifyClients: () => void = () => {};
  let building = false;
  let queued = false;
  async function rebuild(): Promise<void> {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    try {
      do {
        queued = false;
        await buildOnce();
      } while (queued);
    } finally {
      building = false;
    }
    notifyClients();
  }

  await rebuild();
  const { notify } = startDevServer(outDir, port);
  notifyClients = notify;

  // Debounced file watcher
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  watchTree(srcDir, (filename) => {
    if (
      !filename.endsWith(".md") &&
      !filename.endsWith(".ts") &&
      !filename.endsWith(".js")
    )
      return;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = null;
      console.log(`Changed: ${filename}`);
      void rebuild();
    }, 150);
  });
  console.log(`Watching ${srcDir}`);
} else if (command === "preview") {
  const flags = flagsFor(["--config", "--out", "--port"]);
  let port: number;
  try {
    port = parsePort(flags["--port"], 4173);
  } catch (error) {
    fail((error as Error).message);
  }
  const configFile = flags["--config"] ?? "press.config.ts";
  let outDir = flags["--out"];
  if (!outDir) {
    const config = existsSync(resolve(process.cwd(), configFile))
      ? await loadConfig(configFile)
      : null;
    outDir = resolve(
      process.cwd(),
      (config?.outDir as string | undefined) ?? "dist",
    );
  } else {
    outDir = resolve(process.cwd(), outDir);
  }
  if (!existsSync(outDir)) {
    fail(`No build at ${outDir}. Run "domphy-press build" first.`);
  }
  const { startServer } = await import("./serve.js");
  startServer(outDir, port);
} else {
  console.error(`Unknown command: ${command ?? "(none)"}`);
  console.error("Usage: domphy-press build | dev | preview");
  process.exit(1);
}
