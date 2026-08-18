import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { ElementNode } from "@domphy/core";
import {
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
};
const negated = new Set<string>();
const argv = process.argv.slice(2).filter((arg) => {
  const positive = NEGATED_FLAGS[arg];
  if (positive) negated.add(positive);
  return !positive;
});

const { values, positionals } = parseArgs({
  args: argv,
  options: {
    only: { type: "string" },
    exclude: { type: "string" },
    reactive: { type: "boolean", default: true },
    output: { type: "boolean", default: true },
    "factory-exec": { type: "boolean", default: true },
    format: { type: "string", default: "text" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});
if (negated.has("reactive")) values.reactive = false;
if (negated.has("output")) values.output = false;
if (negated.has("factory-exec")) values["factory-exec"] = false;

// --no-factory-exec: never invoke exported functions as zero-arg factories,
// and skip Layer 4 `new ElementNode` (that constructor runs `_onInit`).
// Component-library files export factories that genuinely require props —
// invoking them only produces `factory-threw` noise. This is a CLI-extraction
// concern, so there is intentionally no matching DiagnoseOptions option:
// diagnose()/validate()/fix() analyze trees the caller hands them and never
// execute factories.
const factoryExec = values["factory-exec"] !== false;

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
  --format text|json   Output format (default: text)
  -h, --help           Show this help

Exit codes:
  0  No errors (warnings/info are fine)
  1  One or more error-severity diagnostics, a file failed to import,
     or an input path was not found
  2  CLI usage error or nothing to analyze
`.trimStart();

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
  process.stderr.write(
    `Unknown --format "${values.format}" (expected "text" or "json").\n`,
  );
  process.exit(2);
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
function collect(
  value: unknown,
  units: unknown[],
  factoryWarnings: Diagnostic[],
  exportName: string,
  seen: Set<unknown>,
  factoryExec: boolean,
): void {
  if (isPlainObject(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    if (findTag(value)) {
      units.push(value);
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
      );
    }
    return;
  }
  if (typeof value === "function") {
    // --no-factory-exec: leave exported functions untouched — no invocation,
    // no factory-threw warning (the export simply is not analyzed).
    if (!factoryExec) return;
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
    collect(result, units, factoryWarnings, exportName, seen, factoryExec);
  }
}

function extractElements(
  mod: Record<string, unknown>,
  factoryExec: boolean,
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
    collect(mod[key], units, factoryWarnings, key, seen, factoryExec);
  }
  return { units, factoryWarnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Try to load tsx/esm/api for TS file imports.
  let tsxImport:
    | ((file: string, parent: string) => Promise<Record<string, unknown>>)
    | null = null;
  try {
    const tsxApi = (await import("tsx/esm/api" as string)) as {
      tsImport: (
        file: string,
        parent: string,
      ) => Promise<Record<string, unknown>>;
    };
    tsxImport = tsxApi.tsImport;
  } catch {
    // tsx not installed — .ts files will be skipped
  }
  const tsxAvailable = tsxImport !== null;

  const { files, notFound } = collectFiles(positionals);
  if (files.length === 0) {
    process.stderr.write("No files to analyze.\n");
    process.exit(2);
  }

  // Comma-separated rule lists. Empty entries (including a bare `--only ""`)
  // are dropped; a list that ends up empty is treated as absent so it cannot
  // accidentally whitelist nothing and silence every diagnostic.
  const parseRuleList = (raw: string | undefined): string[] | undefined => {
    if (raw === undefined) return undefined;
    const list = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return list.length > 0 ? list : undefined;
  };

  const options: DiagnoseOptions = {
    runReactive: values.reactive !== false,
    only: parseRuleList(values.only),
    exclude: parseRuleList(values.exclude),
  };

  const allDiags: Array<{ file: string; diags: Diagnostic[] }> = [];
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
      if (needsTsx(file)) {
        mod = await tsxImport!(pathToFileURL(file).href, import.meta.url);
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
      process.stderr.write(
        `✗ Failed to import: ${file}\n  ${error instanceof Error ? error.message : String(error)}\n`,
      );
      continue;
    }

    const { units, factoryWarnings } = extractElements(mod, factoryExec);
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
      allDiags.push({ file, diags: fileDiags });
      for (const d of fileDiags) {
        if (d.severity === "error") totalErrors++;
        else if (d.severity === "warning") totalWarnings++;
        else totalInfo++;
      }
    }
  }

  if (values.format === "json") {
    // Per-file entries keep their { file, diags } shape; the payload gains a
    // top-level summary so JSON consumers can see skipped/failed/not-found
    // counts and severity totals that the text summary already prints.
    const payload = {
      files: allDiags,
      summary: {
        scanned: files.length - skipped - failed,
        skipped,
        failed,
        notFound,
        errors: totalErrors,
        warnings: totalWarnings,
        info: totalInfo,
      },
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    const checked = files.length - skipped - failed;
    for (const { file, diags } of allDiags) {
      process.stdout.write(`\n${file}\n${format(diags)}\n`);
    }
    const parts = [
      `${checked} file(s) checked`,
      totalErrors > 0 ? `${totalErrors} error(s)` : null,
      totalWarnings > 0 ? `${totalWarnings} warning(s)` : null,
      totalInfo > 0 ? `${totalInfo} info` : null,
      skipped > 0 ? `${skipped} skipped` : null,
      failed > 0 ? `${failed} failed to import` : null,
      notFound > 0 ? `${notFound} not found` : null,
    ].filter(Boolean);
    process.stdout.write(
      `\n${allDiags.length > 0 ? `${"─".repeat(40)}\n` : ""}${parts.join(" · ")}\n`,
    );
  }

  // A file that failed to import or an input path that was not found means
  // part of the codebase went unanalyzed — that must not exit 0.
  process.exit(totalErrors > 0 || failed > 0 || notFound > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(2);
});
