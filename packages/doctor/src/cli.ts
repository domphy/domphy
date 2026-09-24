import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeSync,
} from "node:fs";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ElementNode } from "@domphy/core";
import {
  BUILTIN_RULE_IDS,
  type DiagnoseOptions,
  type Diagnostic,
  diagnose,
  format,
} from "./diagnose.js";
import { auditOutput } from "./layer4.js";
import { findTag, isPlainObject } from "./shared.js";

// Node's parseArgs does not auto-negate boolean flags, so the documented
// --no-reactive / --no-output forms would crash with
// ERR_PARSE_ARGS_UNKNOWN_OPTION. Translate them into their positive
// counterparts before parsing.
const NEGATED_FLAGS: Record<string, string> = {
  "--no-reactive": "reactive",
  "--no-output": "output",
  "--no-factory-exec": "factory-exec",
  "--no-dom": "dom",
};
const negated = new Set<string>();
const argv = process.argv.slice(2).filter((arg) => {
  const positive = NEGATED_FLAGS[arg];
  if (positive) negated.add(positive);
  return !positive;
});

const USAGE = `
Usage: domphy-doctor [options] <path...>

Arguments:
  path    TS/JS file or directory to analyze (skips node_modules, dist)

Options:
  --only <rules>       Only run these rule IDs (comma-separated)
  --exclude <rules>    Skip these rule IDs (comma-separated)
  --no-reactive        Skip reactive function evaluation
  --no-output          Skip Layer 4 HTML+CSS linting (htmlhint + stylelint)
  --no-factory-exec    Never invoke exported functions as zero-arg factories
                       (suppresses factory-threw warnings on component-library
                       files whose factories require props); also skip Layer 4
                       ElementNode construction, which would run _onInit
  --no-dom             Do not install a DOM. By default, when the scanned
                       project has jsdom installed, a window/document is put on
                       globalThis so modules that touch the DOM at import time
                       can be analyzed instead of failing to import
  --merge-patches      A $-patch factory (returns a PartialElement — a
                       style/$ object with no tag key, meant to be applied via
                       { button: "…", $: [button()] }) is analyzed as its own
                       element instead of being walked as a plain container:
                       synthesized onto the host tag its JSDoc @hostTag names
                       (packages/ui's own convention), or "div" when none is
                       found. Off by default — it changes what gets analyzed,
                       not just how noisily
  --format text|json   Output format (default: text)
  -h, --help           Show this help

Exit codes:
  0  No errors (warnings/info are fine)
  1  One or more error-severity diagnostics, a file failed to import,
     or an input path was not found alongside files that were analyzed
  2  CLI usage error (unknown flag, rule id or format), or nothing to
     analyze at all (including when every input path was not found)
`.trimStart();

/** Prints a usage error and exits 2 — never a raw Node stack trace. */
function usageError(message: string): never {
  process.stderr.write(`${message}\n\n${USAGE}`);
  process.exit(2);
}

// A lint CLI that exits 0 without finishing is a false green in CI — the build
// passes over code nobody checked. The failing code is set BEFORE any work and
// only replaced by the real one on a completed run, so every abnormal end
// (an out-of-memory abort, a scanned module killing the process, a throw
// outside the per-file try/catch) leaves a non-zero code behind.
process.exitCode = 2;

function fatal(what: string, error: unknown): never {
  process.stderr.write(
    `✗ domphy-doctor ${what}: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(2);
}

// An imported module can schedule work that fails after its import settled (a
// timer, a floating promise, a listener). Node would print the error and exit
// non-zero on its own for an uncaught exception, but an unhandled rejection is
// only fatal by default — both are routed here so the message names the CLI
// and the code is always 2.
process.on("uncaughtException", (error) => fatal("crashed", error));
process.on("unhandledRejection", (reason) => fatal("crashed", reason));

// parseArgs runs at module scope, outside main()'s catch: an unknown flag threw
// ERR_PARSE_ARGS_UNKNOWN_OPTION as an uncaught exception, printing a Node stack
// trace and exiting 1 — indistinguishable from "found errors" in CI.
function parseCliArgs() {
  try {
    return parseArgs({
      args: argv,
      options: {
        only: { type: "string" },
        exclude: { type: "string" },
        reactive: { type: "boolean", default: true },
        output: { type: "boolean", default: true },
        "factory-exec": { type: "boolean", default: true },
        dom: { type: "boolean", default: true },
        "merge-patches": { type: "boolean", default: false },
        format: { type: "string", default: "text" },
        help: { type: "boolean", short: "h", default: false },
      },
      allowPositionals: true,
    });
  } catch (error) {
    // usageError returns never, so the option types still infer from the try.
    usageError(error instanceof Error ? error.message : String(error));
  }
}
const { values, positionals } = parseCliArgs();
if (negated.has("reactive")) values.reactive = false;
if (negated.has("output")) values.output = false;
if (negated.has("factory-exec")) values["factory-exec"] = false;
if (negated.has("dom")) values.dom = false;

// --no-factory-exec: never invoke exported functions as zero-arg factories,
// and skip Layer 4 `new ElementNode` (that constructor runs `_onInit`).
// Component-library files export factories that genuinely require props —
// invoking them only produces `factory-threw` noise. This is a CLI-extraction
// concern, so there is intentionally no matching DiagnoseOptions option:
// diagnose()/validate()/fix() analyze trees the caller hands them and never
// execute factories.
const factoryExec = values["factory-exec"] !== false;
const mergePatches = values["merge-patches"] === true;

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (positionals.length === 0) {
  process.stdout.write(USAGE);
  process.exit(2);
}
// parseArgs accepts any string for --format; reject unknown values instead of
// silently falling back to text output (a CI pipeline asking for "json" but
// getting text would break its parser downstream).
if (values.format !== "text" && values.format !== "json") {
  usageError(
    `Unknown --format "${values.format}" (expected "text" or "json").`,
  );
}

// Comma-separated rule lists. Empty entries (including a bare `--only ""`) are
// dropped; a list that ends up empty is treated as absent so it cannot
// accidentally whitelist nothing and silence every diagnostic.
//
// A typo'd id is rejected rather than ignored: `--only inline-typografy` would
// otherwise whitelist a rule that never fires, printing a clean report and
// exiting 0 — a silently green CI run. Layer 4 ids are generated from
// htmlhint/stylelint rule names (`html/…`, `css/…`) and cannot be enumerated
// here, so namespaced ids pass through unchecked.
const KNOWN_RULE_IDS = new Set<string>([...BUILTIN_RULE_IDS, "factory-threw"]);

function parseRuleList(
  raw: string | undefined,
  flag: string,
): string[] | undefined {
  if (raw === undefined) return undefined;
  const list = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const unknown = list.filter(
    (entry) => !entry.includes("/") && !KNOWN_RULE_IDS.has(entry),
  );
  if (unknown.length > 0) {
    usageError(
      `Unknown rule id${unknown.length > 1 ? "s" : ""} for ${flag}: ${unknown
        .map((entry) => `"${entry}"`)
        .join(", ")}\nKnown rules: ${[...KNOWN_RULE_IDS].sort().join(", ")}`,
    );
  }
  return list.length > 0 ? list : undefined;
}

// ─── File collection ─────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", ".nuxt"]);

function isSourceFile(p: string): boolean {
  const ext = extname(p);
  return (
    ext === ".ts" ||
    ext === ".tsx" ||
    ext === ".js" ||
    ext === ".jsx" ||
    ext === ".mjs" ||
    ext === ".cjs"
  );
}

function walkDir(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, out);
    } else if (isSourceFile(full)) {
      out.push(full);
    }
  }
}

function collectFiles(paths: string[]): { files: string[]; notFound: number } {
  const files: string[] = [];
  let notFound = 0;
  for (const p of paths) {
    const abs = resolve(p);
    if (!existsSync(abs)) {
      // A missing input path means part of what the user asked to analyze
      // went unanalyzed — counted so the run cannot exit 0 (unless nothing
      // analyzable remains at all, which stays the exit-2 usage case).
      notFound++;
      process.stderr.write(`✗ Not found: ${p}\n`);
      continue;
    }
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walkDir(abs, files);
    } else if (isSourceFile(abs)) {
      files.push(abs);
    }
  }
  return { files, notFound };
}

// ─── Element extraction ───────────────────────────────────────────────────────

// Extraction units: a single element object, or an array of sibling elements.
// Arrays stay intact so sibling-context rules (duplicate-key, …) see the
// whole list instead of each item in isolation.
// A `$`-patch factory (`button()`, `card()`, …) returns a `PartialElement` —
// a bag of `style`/`$`/attribute keys meant to be spread onto a real element
// via `{ button: "…", $: [button()] }` — never a tag of its own. Distinguished
// from a genuine container object (a route map `{ home: { div: … } }`) by
// carrying the two markers only a PartialElement has: a `style` object, or its
// own `$` array (a patch that composes another one, e.g. buttonGhost()).
function looksLikePatch(value: Record<string, unknown>): boolean {
  return isPlainObject(value.style) || Array.isArray(value.$);
}

// `@hostTag <tag>` — the JSDoc convention `packages/ui/src/patches/*.ts`
// already documents on every patch factory (see button.ts) — paired with the
// `function <name>` it precedes. Read from the file's own source text, not
// the compiled export: the doc comment carries information no runtime value
// does. Best-effort: a patch with no @hostTag, or a file that does not follow
// the "doc comment directly above the function" convention, is not in the map.
function hostTagsFromSource(sourceText: string): Map<string, string> {
  const hostTags = new Map<string, string>();
  const pattern =
    /\/\*\*[\s\S]*?@hostTag\s+([a-zA-Z][a-zA-Z0-9-]*)[\s\S]*?\*\/\s*(?:export\s+)?function\s+([A-Za-z_$][\w$]*)/g;
  for (const match of sourceText.matchAll(pattern)) {
    hostTags.set(match[2], match[1]);
  }
  return hostTags;
}

function collect(
  value: unknown,
  units: unknown[],
  factoryWarnings: Diagnostic[],
  exportName: string,
  seen: Set<unknown>,
  factoryExec: boolean,
  hostTags: Map<string, string> | null,
): void {
  if (isPlainObject(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    if (findTag(value)) {
      units.push(value);
      return;
    }
    // --merge-patches: a PartialElement is analyzed as ITS OWN element,
    // synthesized onto the host tag its JSDoc names (or "div", the doctor
    // rules that actually care about a specific tag are a small minority).
    // The synthetic element's `$` is exactly this patch — `diagnose()`
    // expands it with the same `expandPatches()` a real declared element
    // goes through, so this is not a second, weaker analysis path.
    if (hostTags !== null && looksLikePatch(value)) {
      const hostTag = hostTags.get(exportName) ?? "div";
      units.push({ [hostTag]: null, $: [value] });
      return;
    }
    // No tag key — not an element but a container object (e.g. a route map
    // `{ home: { div: … } }`); descend into its values. `_`-prefixed keys are
    // Domphy metadata/lifecycle (`_onMount`, `_behaviors`, `_key`, …) — never
    // element containers — and their function values are lifecycle callbacks,
    // not zero-arg factories: invoking them would run arbitrary hooks out of
    // context (they expect a node/args and throw without them).
    for (const key of Object.keys(value)) {
      if (key.startsWith("_")) continue;
      collect(
        value[key],
        units,
        factoryWarnings,
        `${exportName}.${key}`,
        seen,
        factoryExec,
        hostTags,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    // An array whose items include element-like objects is a sibling list —
    // keep it as ONE unit so array-level rules (duplicate-key, …) see all
    // items together. An array with NO element-like items is plain data (e.g.
    // fixture records like `{ name: "Acme Inc", plan: "Enterprise" }` inside a
    // default-props export), not UI: descend into it so a nested element is
    // still found, without flagging each data record as unknown tags.
    if (value.some((item) => isPlainObject(item) && findTag(item))) {
      units.push(value);
      return;
    }
    for (const [index, item] of value.entries()) {
      collect(
        item,
        units,
        factoryWarnings,
        `${exportName}[${index}]`,
        seen,
        factoryExec,
        hostTags,
      );
    }
    return;
  }
  if (typeof value === "function") {
    // --no-factory-exec: leave exported functions untouched — no invocation,
    // no factory-threw warning (the export simply is not analyzed).
    if (!factoryExec) return;
    // A function whose declared arity is > 0 requires an argument by its own
    // signature — calling it with none is not a factory execution, it is
    // guaranteed to throw regardless of what the function does. `.length`
    // already excludes any parameter with a default value (and everything
    // after it), so an options-with-defaults export (`(options = {}) => …`)
    // still reports 0 here and is invoked normally below. Report once, as
    // info (not a warning/error — this is not a code defect to fix), and
    // move on without invoking.
    const arity = (value as (...args: unknown[]) => unknown).length;
    if (arity > 0) {
      factoryWarnings.push({
        rule: "factory-threw",
        severity: "info",
        path: `(export ${exportName})`,
        message: `Exported "${exportName}" declares ${arity} required parameter(s) — skipped: requires arguments.`,
        hint: "Only exports callable with zero arguments (no required params, or all-default options) are invoked as factories.",
      });
      return;
    }
    // Factory exports are EXECUTED with zero arguments — an export with side
    // effects will run them here. Element and array results feed the same
    // unit paths as static exports.
    let result: unknown;
    try {
      result = (value as () => unknown)();
    } catch (error) {
      // A throwing factory must not vanish silently: report a warning so the
      // unanalyzed export is visible, without failing the whole run.
      factoryWarnings.push({
        rule: "factory-threw",
        severity: "warning",
        path: `(export ${exportName})`,
        message: `Exported factory "${exportName}" threw when invoked with no arguments: ${error instanceof Error ? error.message : String(error)}`,
        hint: "Only zero-argument factories can be analyzed — give the export a callable-with-no-args shape.",
      });
      return;
    }
    // Guard against a factory returning itself (would recurse forever).
    if (result == null || result === value) return;
    collect(
      result,
      units,
      factoryWarnings,
      exportName,
      seen,
      factoryExec,
      hostTags,
    );
  }
}

function extractElements(
  mod: Record<string, unknown>,
  factoryExec: boolean,
  // Identity of every export already analyzed in THIS run. The ESM loader
  // caches a module, so a barrel re-exported by many files hands back the very
  // same function object each time: without this, every block in
  // `@domphy/blocks` was executed and diagnosed once per importing file (173
  // factories x ~180 one-line re-export files in apps/web/docs/demos/blocks),
  // and each run produced ~180 identical copies of the same diagnostic. The set
  // holds module exports, which the loader's own cache already retains, so it
  // adds no retention of its own — factory RESULTS are never added, they stay
  // collectable once the file's report is written.
  analyzedExports: Set<unknown>,
  // Non-null only with --merge-patches: see collect()'s PartialElement branch.
  hostTags: Map<string, string> | null,
): {
  units: unknown[];
  factoryWarnings: Diagnostic[];
} {
  const units: unknown[] = [];
  const factoryWarnings: Diagnostic[] = [];
  const seen = new Set<unknown>();
  for (const key of Object.keys(mod)) {
    // `_`-prefixed exports are private by convention — same skip as the
    // container-object descent in collect().
    if (key.startsWith("_")) continue;
    const value = mod[key];
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function")
    ) {
      if (analyzedExports.has(value)) continue;
      analyzedExports.add(value);
    }
    collect(value, units, factoryWarnings, key, seen, factoryExec, hostTags);
  }
  return { units, factoryWarnings };
}

// ─── DOM environment ──────────────────────────────────────────────────────────

/**
 * Put a jsdom window on `globalThis` so files that touch the DOM at import
 * time can be analyzed. Without it a single module-scope `document.querySelector`
 * (a page island, a library feature-detecting at module scope) made the whole
 * file fail to import, and everything it exported went unanalyzed.
 *
 * jsdom is an OPTIONAL peer, resolved from the scanned project's own
 * `node_modules` rather than doctor's — the same "use it when the host has it"
 * contract Layer 4 has with htmlhint/stylelint, except the host is the project
 * under analysis. Returns the reason it did not install one, or null on success.
 *
 * `pretendToBeVisual: true` is what makes a scanned module's real runtime
 * behavior — a mounted component starting an animation loop or polling
 * interval at import/factory time — possible at all; see
 * {@link installTimerWatchdog} for what bounds it.
 */
async function installDom(): Promise<string | null> {
  if (typeof (globalThis as { document?: unknown }).document !== "undefined") {
    return null; // a DOM is already present (someone ran us under one)
  }
  let jsdomUrl: string;
  try {
    jsdomUrl = pathToFileURL(
      createRequire(join(process.cwd(), "index.js")).resolve("jsdom"),
    ).href;
  } catch {
    return "jsdom is not installed in this project";
  }
  let JSDOM: new (
    html: string,
    options?: Record<string, unknown>,
  ) => { window: Window & Record<string, unknown> };
  try {
    const mod = (await import(jsdomUrl)) as {
      JSDOM?: typeof JSDOM;
      default?: { JSDOM?: typeof JSDOM };
    };
    const found = mod.JSDOM ?? mod.default?.JSDOM;
    if (!found) return "the resolved jsdom has no JSDOM export";
    JSDOM = found;
  } catch (error) {
    return `jsdom failed to load: ${error instanceof Error ? error.message : String(error)}`;
  }

  const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const target = globalThis as Record<string, unknown>;
  const define = (key: string, value: unknown) =>
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value,
    });
  define("window", window);
  define("document", window.document);
  // Copy every other window global Node does not already define. Node owns its
  // own `navigator`, `fetch`, `crypto`, … and overwriting those would change
  // how unrelated code behaves; the DOM half is what is missing.
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in target) continue;
    define(key, window[key]);
  }
  return null;
}

/**
 * Wraps `setTimeout`/`setInterval`/`requestAnimationFrame` on `globalThis` to
 * track every handle a scanned module creates, and returns a function that
 * clears all of them at once. A scanned module runs for real at import or
 * factory-invocation time — a component that starts a polling interval or an
 * animation-frame loop keeps running (and keeps Node's event loop alive) long
 * after this CLI is done looking at it, competing with every file scanned
 * after it for the rest of the run. `main()`'s explicit `process.exit()`
 * already guarantees the PROCESS terminates regardless, but nothing bounded
 * the accumulation DURING a scan of many files until now — the caller clears
 * after each file, so a runaway from file N cannot outlive file N's own
 * processing window.
 *
 * `setInterval`/`setTimeout` are Node's own (real timers doctor cannot afford
 * to leave unbounded); `requestAnimationFrame` is jsdom's — see
 * `pretendToBeVisual` in {@link installDom} — present only when a DOM was
 * installed, so it is optional here.
 */
function installTimerWatchdog(): () => void {
  const target = globalThis as Record<string, unknown>;
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  const frames = new Set<number>();

  const realSetTimeout = target.setTimeout as typeof setTimeout;
  const realSetInterval = target.setInterval as typeof setInterval;
  const realRequestAnimationFrame = target.requestAnimationFrame as
    | ((callback: (time: number) => void) => number)
    | undefined;
  const realCancelAnimationFrame = target.cancelAnimationFrame as
    | ((handle: number) => void)
    | undefined;

  target.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
    const handle = realSetTimeout(...args);
    timeouts.add(handle);
    return handle;
  }) as typeof setTimeout;
  target.setInterval = ((...args: Parameters<typeof setInterval>) => {
    const handle = realSetInterval(...args);
    intervals.add(handle);
    return handle;
  }) as typeof setInterval;
  if (realRequestAnimationFrame) {
    target.requestAnimationFrame = ((callback: (time: number) => void) => {
      const handle = realRequestAnimationFrame(callback);
      frames.add(handle);
      return handle;
    }) as typeof requestAnimationFrame;
  }

  return () => {
    for (const handle of timeouts) clearTimeout(handle);
    for (const handle of intervals) clearInterval(handle);
    if (realCancelAnimationFrame) {
      for (const handle of frames) realCancelAnimationFrame(handle);
    }
    timeouts.clear();
    intervals.clear();
    frames.clear();
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Validated at module scope so a typo'd rule id fails before any file walking.
const options: DiagnoseOptions = {
  runReactive: values.reactive !== false,
  only: parseRuleList(values.only, "--only"),
  exclude: parseRuleList(values.exclude, "--exclude"),
};

async function main(): Promise<void> {
  // TypeScript support comes from tsx. `register()` installs the loader hooks
  // process-wide and then a plain `import()` resolves .ts through Node's OWN
  // module registry — so a module imported by many scanned files is evaluated
  // ONCE. tsx's other entry point, `tsImport()`, deliberately bypasses that
  // registry (it cache-busts so a changed file re-evaluates), which meant every
  // scanned file re-instantiated its entire import graph: scanning
  // apps/web/docs/demos/blocks (173 one-line files, each importing the
  // @domphy/blocks barrel) built 173 copies of blocks + chart + luma.gl +
  // three and died at the 2 GB heap limit, with "luma.gl: This version of
  // luma.gl has already been initialized" printed 162 times as the tell.
  // `tsImport` is kept as a fallback for a tsx build without `register`.
  let tsxImport:
    | ((file: string, parent: string) => Promise<Record<string, unknown>>)
    | null = null;
  let tsxRegistered = false;
  try {
    const tsxApi = (await import("tsx/esm/api" as string)) as {
      register?: () => unknown;
      tsImport: (
        file: string,
        parent: string,
      ) => Promise<Record<string, unknown>>;
    };
    if (typeof tsxApi.register === "function") {
      tsxApi.register();
      tsxRegistered = true;
    } else {
      tsxImport = tsxApi.tsImport;
    }
  } catch {
    // tsx not installed — .ts files will be skipped
  }
  const tsxAvailable = tsxRegistered || tsxImport !== null;

  // Before ANY file is imported: a module-scope `document` access must find one.
  const domReason = values.dom === false ? null : await installDom();
  // Installed unconditionally, not just with a DOM: Node's own setTimeout/
  // setInterval are as real a risk without one.
  const clearScannedTimers = installTimerWatchdog();

  const { files, notFound } = collectFiles(positionals);
  if (files.length === 0) {
    process.stderr.write("No files to analyze.\n");
    process.exit(2);
  }

  // The report is STREAMED, not accumulated: each file's diagnostics are
  // written as soon as they are computed and then dropped. Holding every
  // diagnostic of a whole run was the dominant retention on a large tree —
  // message + hint strings for hundreds of thousands of findings — and nothing
  // downstream needs them once they are printed. Only the counters survive the
  // loop. `writeSync` rather than `process.stdout.write` because the run ends
  // in `process.exit()`, which does not flush a pending async pipe write.
  const jsonOutput = values.format === "json";
  let reportedFiles = 0;
  const write = (chunk: string) => writeSync(1, chunk);
  if (jsonOutput) write('{\n  "files": [');

  // Identity of every export analyzed so far — see extractElements().
  const analyzedExports = new Set<unknown>();
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;
  let skipped = 0;
  let failed = 0;
  let tsxWarned = false;

  // Extensions that need a TS/JSX-aware loader (tsx) to import.
  const needsTsx = (file: string) =>
    file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".jsx");

  for (const file of files) {
    // Clears whatever the PREVIOUS file left running before this one starts —
    // see installTimerWatchdog(). The very last file's leftovers are cleared
    // once more right after the loop.
    clearScannedTimers();
    if (needsTsx(file) && !tsxAvailable) {
      if (!tsxWarned) {
        process.stderr.write(
          "⚠ tsx not found — .ts/.tsx/.jsx files skipped. Add tsx to your devDependencies.\n",
        );
        tsxWarned = true;
      }
      skipped++;
      continue;
    }

    let mod: Record<string, unknown>;
    try {
      if (needsTsx(file) && tsxImport) {
        mod = await tsxImport(pathToFileURL(file).href, import.meta.url);
      } else {
        mod = (await import(pathToFileURL(file).href)) as Record<
          string,
          unknown
        >;
      }
    } catch (error) {
      // Never swallow a per-file failure: an unimportable file means part of
      // the codebase went unanalyzed. Report it and count it in the summary.
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      // A "document is not defined" style failure is the one case the user can
      // fix by installing a DOM — say so, once, instead of leaving them with a
      // bare ReferenceError.
      const domHint =
        domReason && /\b(document|window|navigator|location)\b/.test(message)
          ? `\n  (${domReason} — install jsdom to analyze files that touch the DOM at import time, or pass --no-dom to silence this)`
          : "";
      // jsdom's own <canvas> has no rendering context unless the optional
      // "canvas" npm package is installed: getContext() returns null and logs
      // "Not implemented: HTMLCanvasElement's getContext()" to the console,
      // then the importing module's own code throws reading a method off that
      // null (e.g. createRadialGradient, drawImage) — a generic-looking error
      // with no mention of canvas in it. Detected by the null-context method
      // names rather than the message text, since the real cause never
      // appears in what we catch here.
      const canvasHint =
        !domReason &&
        /\b(getContext|createRadialGradient|createLinearGradient|drawImage|fillRect|getImageData|createPattern)\b/.test(
          message,
        )
          ? '\n  (jsdom\'s <canvas> has no rendering context without the optional "canvas" npm package — install it to analyze files that draw to a <canvas> at import time, or pass --no-dom to silence this)'
          : "";
      process.stderr.write(
        `✗ Failed to import: ${file}\n  ${message}${domHint}${canvasHint}\n`,
      );
      continue;
    }

    const hostTags = mergePatches
      ? hostTagsFromSource(readFileSync(file, "utf8"))
      : null;
    const { units, factoryWarnings } = extractElements(
      mod,
      factoryExec,
      analyzedExports,
      hostTags,
    );
    // Factory warnings are file-level (not rule-engine) diagnostics, so they
    // bypass the only/exclude rule filters on purpose.
    const fileDiags: Diagnostic[] = [...factoryWarnings];
    for (const unit of units) {
      // Layer 1–3: static analysis. diagnose() accepts an array root, so a
      // sibling array is analyzed as one unit and array-level rules
      // (duplicate-key, …) see all items together.
      fileDiags.push(...diagnose(unit, options));

      // Layer 4: HTML + CSS output analysis via htmlhint + stylelint.
      // ElementNode needs a single element root, so array units are audited
      // per element. `new ElementNode` runs `_onInit` — skip the construct
      // when --no-factory-exec, which means "do not execute user functions".
      if (values.output !== false && factoryExec) {
        const elements = Array.isArray(unit)
          ? unit.filter((item) => isPlainObject(item) && findTag(item))
          : [unit];
        for (const el of elements) {
          try {
            const node = new ElementNode(el as any);
            let outputDiags = await auditOutput(node, { path: file });
            // Apply same only/exclude filters as Layer 1–3
            if (options.only !== undefined) {
              const only = new Set(options.only);
              outputDiags = outputDiags.filter((d) => only.has(d.rule));
            } else if (options.exclude !== undefined) {
              const exclude = new Set(options.exclude);
              outputDiags = outputDiags.filter((d) => !exclude.has(d.rule));
            }
            fileDiags.push(...outputDiags);
          } catch {
            // ElementNode construction failed — skip layer 4 for this element
          }
        }
      }
    }

    if (fileDiags.length > 0) {
      for (const d of fileDiags) {
        if (d.severity === "error") totalErrors++;
        else if (d.severity === "warning") totalWarnings++;
        else totalInfo++;
      }
      if (jsonOutput) {
        // Same shape a single JSON.stringify(payload, null, 2) produced:
        // { "files": [ { file, diags }, … ], "summary": { … } }.
        write(
          `${reportedFiles === 0 ? "\n" : ",\n"}${JSON.stringify(
            { file, diags: fileDiags },
            null,
            2,
          )
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}`,
        );
      } else {
        write(`\n${file}\n${format(fileDiags)}\n`);
      }
      reportedFiles++;
    }
  }
  clearScannedTimers(); // the last file's leftovers, same as every file before it

  const summary = {
    scanned: files.length - skipped - failed,
    skipped,
    failed,
    notFound,
    errors: totalErrors,
    warnings: totalWarnings,
    info: totalInfo,
  };

  if (jsonOutput) {
    write(
      `${reportedFiles > 0 ? "\n  " : ""}],\n  "summary": ${JSON.stringify(
        summary,
        null,
        2,
      )
        .split("\n")
        .map((line, index) => (index === 0 ? line : `  ${line}`))
        .join("\n")}\n}\n`,
    );
  } else {
    const parts = [
      `${summary.scanned} file(s) checked`,
      totalErrors > 0 ? `${totalErrors} error(s)` : null,
      totalWarnings > 0 ? `${totalWarnings} warning(s)` : null,
      totalInfo > 0 ? `${totalInfo} info` : null,
      skipped > 0 ? `${skipped} skipped` : null,
      failed > 0 ? `${failed} failed to import` : null,
      notFound > 0 ? `${notFound} not found` : null,
    ].filter(Boolean);
    write(
      `\n${reportedFiles > 0 ? `${"─".repeat(40)}\n` : ""}${parts.join(" · ")}\n`,
    );
  }

  // Node reports an unhandled rejection only after the microtask queue drains;
  // exiting synchronously here raced it (lost on Linux CI), so yield one
  // macrotask first to let the "unhandledRejection" handler above run.
  await new Promise((resolve) => setImmediate(resolve));

  // A file that failed to import or an input path that was not found means
  // part of the codebase went unanalyzed — that must not exit 0.
  process.exit(totalErrors > 0 || failed > 0 || notFound > 0 ? 1 : 0);
}

main().catch((error: unknown) => fatal("failed", error));
