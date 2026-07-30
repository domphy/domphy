// CLI support helpers, kept free of top-level side effects so they can be
// unit-tested (cli.ts itself runs on import).

import {
  existsSync,
  type FSWatcher,
  readdirSync,
  rmSync,
  statSync,
  watch,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type * as EsbuildType from "esbuild";

// --- Flag parsing ------------------------------------------------------------

/**
 * Parses `--flag value` and `--flag=value` forms. Flags not in `known` are
 * collected in `unknown` (for a warning) instead of being silently ignored.
 */
export function parseFlags(
  args: string[],
  known: string[],
): { flags: Record<string, string | undefined>; unknown: string[] } {
  const flags: Record<string, string | undefined> = {};
  const unknown: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    if (!known.includes(name)) {
      unknown.push(name);
      continue;
    }
    if (eq !== -1) {
      flags[name] = arg.slice(eq + 1);
    } else if (index + 1 < args.length && !args[index + 1].startsWith("--")) {
      flags[name] = args[++index];
    } else {
      flags[name] = undefined;
    }
  }
  return { flags, unknown };
}

/** Validates a `--port` value. Throws an actionable error on garbage input
 *  instead of letting `listen(NaN)` explode deep inside node:http. */
export function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid --port "${raw}" — expected an integer between 1 and 65535.`,
    );
  }
  return port;
}

// --- Config loading ----------------------------------------------------------

/**
 * Loads `press.config.ts` (or .js/.mjs) on any supported Node version.
 * Node < 22.18 cannot import TypeScript directly (ERR_UNKNOWN_FILE_EXTENSION),
 * so the config is transpiled-and-loaded with esbuild (already a dependency):
 * bundled to a temporary .mjs next to the config (so bare imports keep
 * resolving against the project's node_modules), imported, then deleted.
 */
export async function loadConfig(
  configFile: string,
  cwd: string = process.cwd(),
): Promise<Record<string, unknown>> {
  const configPath = resolve(cwd, configFile);
  if (!existsSync(configPath)) {
    throw new Error(
      `Config not found: ${configPath}\nCreate a press.config.ts (see https://domphy.com/docs/press/) or pass --config <path>.`,
    );
  }
  const { build } = (await import("esbuild")) as typeof EsbuildType;
  const bundledPath = join(
    dirname(configPath),
    `.press.config.${process.pid}.${Math.random().toString(36).slice(2)}.mjs`,
  );
  try {
    await build({
      entryPoints: [configPath],
      outfile: bundledPath,
      bundle: true,
      platform: "node",
      format: "esm",
      // Keep package imports external — the temp file sits next to the
      // config, so they resolve against the project's node_modules.
      packages: "external",
      logLevel: "silent",
    });
    const loaded = (await import(pathToFileURL(bundledPath).href)) as {
      default?: unknown;
    };
    const userConfig = loaded.default ?? loaded;
    return typeof userConfig === "function"
      ? ((await userConfig()) as Record<string, unknown>)
      : (userConfig as Record<string, unknown>);
  } catch (error) {
    throw new Error(
      `Failed to load ${configFile}: ${(error as Error).message || error}`,
    );
  } finally {
    rmSync(bundledPath, { force: true });
  }
}

// --- Recursive watching ------------------------------------------------------

/**
 * Watches `root` recursively. `fs.watch({ recursive: true })` is unavailable
 * on Linux Node < 19.1 (it throws ERR_FEATURE_UNAVAILABLE_ON_PLATFORM), so
 * fall back to watching every directory individually.
 */
export function watchTree(
  root: string,
  onChange: (filename: string) => void,
): FSWatcher[] {
  try {
    return [
      watch(root, { recursive: true }, (_event, filename) => {
        if (filename) onChange(filename);
      }),
    ];
  } catch {
    const watchers: FSWatcher[] = [];
    const walk = (dir: string): void => {
      watchers.push(
        watch(dir, (_event, filename) => {
          if (filename) onChange(join(relative(root, dir), filename));
        }),
      );
      for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        const full = join(dir, entry);
        try {
          if (statSync(full).isDirectory()) walk(full);
        } catch {
          /* entry vanished between readdir and stat */
        }
      }
    };
    walk(root);
    return watchers;
  }
}
