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

  it("diagnoses an exported array as one unit so duplicate-key fires", async () => {
    const result = await runCli(["--no-output", fixture("cli-dup-keys.mjs")]);
    expect(result.code).toBe(1);
    expect(result.stdout).toContain("duplicate-key");
    // The diagnostic is attributed to the file that exported the array.
    expect(result.stdout).toContain("cli-dup-keys.mjs");
  }, 30000);

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
