import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Spawns the real CLI (src/cli.ts via tsx, the same loader the bin relies on)
// against tiny .mjs fixtures. Covers argument handling, exit codes, and the
// per-file failure reporting — previously a file that threw on import was
// silently counted as "skipped" and the run could exit 0.

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../src/cli.ts");
const fixture = (name: string) => resolve(here, "fixtures", name);

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      ["--import", "tsx", cli, ...args],
      { cwd: resolve(here, "..") },
      (error, stdout, stderr) => {
        resolvePromise({
          code: error ? (error.code as number) : 0,
          stdout,
          stderr,
        });
      },
    );
  });
}

describe("domphy-doctor CLI", () => {
  it("prints usage and exits 2 with no arguments", async () => {
    const result = await runCli([]);
    expect(result.code).toBe(2);
    expect(result.stdout).toContain("Usage: domphy-doctor");
  }, 30000);

  it("prints usage and exits 0 with --help", async () => {
    const result = await runCli(["--help"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Usage: domphy-doctor");
  }, 30000);

  it("exits 2 when the path does not exist", async () => {
    const result = await runCli(["does-not-exist.mjs"]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Not found");
  }, 30000);

  it("exits 0 for a clean file", async () => {
    const result = await runCli(["--no-output", fixture("cli-ok.mjs")]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("exits 1 on error-severity diagnostics", async () => {
    const result = await runCli(["--no-output", fixture("cli-void-error.mjs")]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("void-content");
    expect(result.stdout).toContain("1 error(s)");
  }, 30000);

  it("reports a per-file import failure on stderr, counts it, and exits 1", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-ok.mjs"),
      fixture("cli-broken.mjs"),
    ]);
    expect(result.code).toBe(1);
    // One stderr line per failed file, with the underlying error message.
    expect(result.stderr).toContain("Failed to import");
    expect(result.stderr).toContain("cli-broken.mjs");
    expect(result.stderr).toContain("boom-import");
    // The summary counts checked and failed files separately — the failed
    // file must NOT vanish into "skipped".
    expect(result.stdout).toContain("1 file(s) checked");
    expect(result.stdout).toContain("1 failed to import");
  }, 30000);

  // Truth source: Node itself. Without a DOM, `document` at module scope is a
  // ReferenceError and the file goes unanalyzed — the `--no-dom` run proves
  // that is still exactly what happens, and the default run proves the
  // installed jsdom window is what makes the same file analyzable.
  it("analyzes a file that touches document at import time", async () => {
    const result = await runCli(["--no-output", fixture("cli-needs-dom.mjs")]);
    expect(result.stderr).not.toContain("Failed to import");
    expect(result.stdout).toContain("1 file(s) checked");
    expect(result.code).toBe(0);
  }, 30000);

  // Truth source: Node's unhandled-rejection contract. A lint CLI that ends
  // with `process.exit(code)` races anything a scanned module left pending, so
  // an error the run never saw must not be able to surface as a clean exit —
  // the code says the run did not complete, and the message names the CLI
  // rather than leaving a bare stack trace.
  it("exits 2 and names itself when a scanned module leaves a rejection unhandled", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-floating-rejection.mjs"),
      fixture("cli-ok.mjs"),
    ]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("domphy-doctor crashed");
    expect(result.stderr).toContain("floating-rejection");
  }, 30000);

  it("--no-dom is a known flag and leaves the file unimportable", async () => {
    const result = await runCli([
      "--no-output",
      "--no-dom",
      fixture("cli-needs-dom.mjs"),
    ]);
    expect(result.stderr).not.toContain("Unknown option");
    expect(result.stderr).toContain("document is not defined");
    expect(result.code).toBe(1);
  }, 30000);

  it("exits 1 when some input paths exist but another is not found", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-ok.mjs"),
      "does-not-exist.mjs",
    ]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Not found");
    expect(result.stdout).toContain("1 not found");
  }, 30000);

  // Reported failing once under heavy concurrent load (many other processes on
  // the same machine), not reproduced in 27/27 sequential runs — this test's
  // logic was never in question, only whether tsx's cold-start compile can
  // outrun the 30s budget when CPU-starved by unrelated work. `retry: 1`
  // absorbs exactly that: a genuine logic regression fails BOTH attempts
  // deterministically (this test's assertions do not depend on timing), while
  // a one-off environmental stall does not fail the suite.
  it("diagnoses an exported array as one unit so duplicate-key fires", {
    retry: 1,
    timeout: 30000,
  }, async () => {
    const result = await runCli(["--no-output", fixture("cli-dup-keys.mjs")]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("duplicate-key");
    // The diagnostic is attributed to the file that exported the array.
    expect(result.stdout).toContain("cli-dup-keys.mjs");
  });

  it("descends into plain container objects to find elements", async () => {
    const result = await runCli(["--no-output", fixture("cli-routes.mjs")]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("void-content");
  }, 30000);

  it("accepts array results from factory exports (array-unit path)", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-factory-array.mjs"),
    ]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("duplicate-key");
  }, 30000);

  it("without --merge-patches, a $-patch factory's own style is unreached (0 findings, not clean)", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-patch-hosttag.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("raw-theme-value");
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("--merge-patches synthesizes the JSDoc @hostTag and finds the raw color inside", async () => {
    const result = await runCli([
      "--no-output",
      "--merge-patches",
      fixture("cli-patch-hosttag.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("raw-theme-value");
    expect(result.stdout).toContain("button");
  }, 30000);

  it("--merge-patches falls back to <div> when the factory has no @hostTag", async () => {
    const result = await runCli([
      "--no-output",
      "--merge-patches",
      fixture("cli-patch-no-hosttag.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("raw-theme-value");
    expect(result.stdout).toContain("div");
  }, 30000);

  it("reports a throwing factory as a warning, not a crash or silent drop", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-factory-throws.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("factory-threw");
    expect(result.stdout).toContain("needs-args");
    expect(result.stdout).toContain("1 warning(s)");
  }, 30000);

  it("skips an arg-requiring export as info, not a factory-threw warning", async () => {
    // Truth source: Function.length (the ECMAScript arity contract — a
    // parameter with no default counts, everything from the first defaulted
    // parameter on does not, per the spec's FormalParameters evaluation).
    // needsRequiredOptions has arity 1 (skipped, info) and hasDefaultOptions
    // has arity 0 (invoked normally, and is bug-free so produces nothing).
    const result = await runCli([
      "--no-output",
      fixture("cli-factory-requires-args.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("factory-threw");
    expect(result.stdout).toContain("skipped: requires arguments");
    expect(result.stdout).toContain("needsRequiredOptions");
    expect(result.stdout).not.toContain("hasDefaultOptions");
    expect(result.stdout).toContain("1 info");
    expect(result.stdout).not.toContain("warning(s)");
  }, 30000);

  it("clears a scanned file's setInterval/setTimeout instead of leaving them running", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-runaway-timers.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stderr).toContain("TIMERS_CLEARED");
    expect(result.stderr).not.toContain("TIMERS_LEAKED");
  }, 30000);

  it("terminates on cyclic container objects", async () => {
    const result = await runCli(["--no-output", fixture("cli-cyclic.mjs")]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("treats an empty --only value as absent instead of silencing everything", async () => {
    const result = await runCli([
      "--no-output",
      "--only",
      "",
      fixture("cli-void-error.mjs"),
    ]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("void-content");
  }, 30000);

  it("does not flag arrays of plain data records as unknown tags", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-data-records.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("unknown-tag");
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("does not invoke `_`-prefixed lifecycle/metadata functions as factories", async () => {
    const result = await runCli([
      "--no-output",
      fixture("cli-underscore-keys.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("factory-threw");
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("skips factory invocation entirely with --no-factory-exec", async () => {
    const result = await runCli([
      "--no-output",
      "--no-factory-exec",
      fixture("cli-factory-throws.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("factory-threw");
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("does not analyze factory results with --no-factory-exec", async () => {
    // Without the flag this fixture exits 1 (duplicate-key inside the factory
    // result); with it the factory is never invoked, so nothing is diagnosed.
    const result = await runCli([
      "--no-output",
      "--no-factory-exec",
      fixture("cli-factory-array.mjs"),
    ]);
    expect(result.code).toBe(0);
    expect(result.stdout).not.toContain("duplicate-key");
    expect(result.stdout).toContain("1 file(s) checked");
  }, 30000);

  it("does not run _onInit via Layer 4 with --no-factory-exec", async () => {
    // Layer 4 constructs ElementNode, which fires _onInit. The flag must
    // skip that construct (or skip Init) while Layers 1–3 still run.
    const result = await runCli([
      "--no-factory-exec",
      fixture("cli-on-init.mjs"),
    ]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("void-content");
    expect(result.stdout).not.toContain("INIT_RAN");
  }, 30000);

  it("runs _onInit via Layer 4 when factory-exec is on", async () => {
    const result = await runCli([fixture("cli-on-init.mjs")]);
    expect(result.stdout).toContain("INIT_RAN");
    expect(result.stdout).toContain("void-content");
  }, 30000);

  it("rejects an unknown --format value with exit 2", async () => {
    const result = await runCli(["--format", "yaml", fixture("cli-ok.mjs")]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Unknown --format "yaml"');
  }, 30000);

  // Truth source: the exit-code contract the CLI publishes in its own --help
  // ("2  CLI usage error …"). An unknown flag used to escape parseArgs at
  // module scope as an uncaught ERR_PARSE_ARGS_UNKNOWN_OPTION: a Node stack
  // trace on stderr and exit 1, which CI reads as "found errors".
  it("rejects an unknown flag with the documented usage exit code 2", async () => {
    const result = await runCli(["--wat", fixture("cli-ok.mjs")]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain("Unknown option '--wat'");
    expect(result.stderr).toContain("Usage: domphy-doctor");
    expect(result.stderr).not.toContain("ERR_PARSE_ARGS_UNKNOWN_OPTION");
  }, 30000);

  // Truth source: same --help contract. `--only <typo>` whitelists a rule that
  // can never fire, so every real diagnostic is filtered out and the run exits
  // 0 — a silently green CI run over unchecked code.
  it("rejects an unknown --only rule id instead of silently filtering everything", async () => {
    const result = await runCli([
      "--no-output",
      "--only",
      "void-contnet",
      fixture("cli-void-error.mjs"),
    ]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'Unknown rule id for --only: "void-contnet"',
    );
    expect(result.stderr).toContain("void-content");
  }, 30000);

  it("rejects an unknown --exclude rule id", async () => {
    const result = await runCli([
      "--no-output",
      "--exclude",
      "not-a-rule",
      fixture("cli-ok.mjs"),
    ]);
    expect(result.code).toBe(2);
    expect(result.stderr).toContain(
      'Unknown rule id for --exclude: "not-a-rule"',
    );
  }, 30000);

  // Layer 4 ids are generated from htmlhint/stylelint rule names at run time,
  // so they cannot be enumerated — namespaced ids must stay accepted.
  it("accepts a namespaced Layer 4 rule id in --only", async () => {
    const result = await runCli([
      "--no-output",
      "--only",
      "html/tag-pair",
      fixture("cli-void-error.mjs"),
    ]);
    expect(result.code).toBe(0);
  }, 30000);

  it("includes summary counts in the JSON payload", async () => {
    const result = await runCli([
      "--no-output",
      "--format",
      "json",
      fixture("cli-ok.mjs"),
      fixture("cli-void-error.mjs"),
      "does-not-exist.mjs",
    ]);
    expect(result.code).toBe(1);
    const payload = JSON.parse(result.stdout) as {
      files: Array<{ file: string; diags: Array<{ rule: string }> }>;
      summary: Record<string, number>;
    };
    // Per-file entries keep their { file, diags } shape.
    const errorFile = payload.files.find((entry) =>
      entry.file.endsWith("cli-void-error.mjs"),
    );
    expect(errorFile?.diags.some((d) => d.rule === "void-content")).toBe(true);
    // Summary counts: scanned/skipped/failed/not-found + severity totals.
    expect(payload.summary).toMatchObject({
      scanned: 2,
      skipped: 0,
      failed: 0,
      notFound: 1,
      errors: 1,
      warnings: 0,
    });
    expect(payload.summary.info).toBeGreaterThanOrEqual(0);
  }, 30000);
});
