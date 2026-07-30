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
});
