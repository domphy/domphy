import { parseArgs } from "node:util";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import {
  diagnose,
  format,
  type DiagnoseOptions,
  type Diagnostic,
} from "./diagnose.js";
import { findTag, isPlainObject } from "./shared.js";
import { auditOutput } from "./layer4.js";
import { ElementNode } from "@domphy/core";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    only: { type: "string" },
    exclude: { type: "string" },
    reactive: { type: "boolean", default: true },
    output: { type: "boolean", default: true },
    format: { type: "string", default: "text" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
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
  --format text|json   Output format (default: text)
  -h, --help           Show this help

Exit codes:
  0  No errors (warnings/info are fine)
  1  One or more error-severity diagnostics
  2  CLI usage error or file not found
`.trimStart();

if (values.help) {
  process.stdout.write(USAGE);
  process.exit(0);
}
if (positionals.length === 0) {
  process.stdout.write(USAGE);
  process.exit(2);
}

// ─── File collection ─────────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".next", ".nuxt"]);

function isSourceFile(p: string): boolean {
  const ext = extname(p);
  return ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".mjs";
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

function collectFiles(paths: string[]): string[] {
  const files: string[] = [];
  for (const p of paths) {
    const abs = resolve(p);
    if (!existsSync(abs)) {
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
  return files;
}

// ─── Element extraction ───────────────────────────────────────────────────────

function collect(value: unknown, out: unknown[]): void {
  if (isPlainObject(value)) {
    if (findTag(value)) {
      out.push(value);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collect(item, out);
  } else if (typeof value === "function") {
    try {
      const result = (value as () => unknown)();
      if (isPlainObject(result) && findTag(result)) out.push(result);
    } catch {
      // factory fn needs args — skip
    }
  }
}

function extractElements(mod: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  for (const key of Object.keys(mod)) {
    collect(mod[key], out);
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Try to load tsx/esm/api for TS file imports.
  let tsxImport: ((file: string, parent: string) => Promise<Record<string, unknown>>) | null = null;
  try {
    const tsxApi = await import("tsx/esm/api" as string) as { tsImport: (file: string, parent: string) => Promise<Record<string, unknown>> };
    tsxImport = tsxApi.tsImport;
  } catch {
    // tsx not installed — .ts files will be skipped
  }
  const tsxAvailable = tsxImport !== null;

  const files = collectFiles(positionals);
  if (files.length === 0) {
    process.stderr.write("No files to analyze.\n");
    process.exit(2);
  }

  const options: DiagnoseOptions = {
    runReactive: values.reactive !== false,
    only: values.only
      ? values.only.split(",").map((s) => s.trim())
      : undefined,
    exclude: values.exclude
      ? values.exclude.split(",").map((s) => s.trim())
      : undefined,
  };

  const allDiags: Array<{ file: string; diags: Diagnostic[] }> = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;
  let skipped = 0;
  let tsxWarned = false;

  for (const file of files) {
    if ((file.endsWith(".ts") || file.endsWith(".tsx")) && !tsxAvailable) {
      if (!tsxWarned) {
        process.stderr.write(
          "⚠ tsx not found — .ts files skipped. Add tsx to your devDependencies.\n",
        );
        tsxWarned = true;
      }
      skipped++;
      continue;
    }

    let mod: Record<string, unknown>;
    try {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        mod = await tsxImport!(pathToFileURL(file).href, import.meta.url);
      } else {
        mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      }
    } catch {
      skipped++;
      continue;
    }

    const elements = extractElements(mod);
    if (elements.length === 0) continue;

    const fileDiags: Diagnostic[] = [];
    for (const el of elements) {
      // Layer 1–3: static analysis on element object + ElementNode
      fileDiags.push(...diagnose(el, options));

      // Layer 4: HTML + CSS output analysis via htmlhint + stylelint
      if (values.output !== false) {
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
    process.stdout.write(JSON.stringify(allDiags, null, 2) + "\n");
  } else {
    const checked = files.length - skipped;
    for (const { file, diags } of allDiags) {
      process.stdout.write(`\n${file}\n${format(diags)}\n`);
    }
    const parts = [
      `${checked} file(s) checked`,
      totalErrors > 0 ? `${totalErrors} error(s)` : null,
      totalWarnings > 0 ? `${totalWarnings} warning(s)` : null,
      totalInfo > 0 ? `${totalInfo} info` : null,
    ].filter(Boolean);
    process.stdout.write(
      `\n${allDiags.length > 0 ? "─".repeat(40) + "\n" : ""}${parts.join(" · ")}\n`,
    );
  }

  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  process.stderr.write(String(err) + "\n");
  process.exit(2);
});
