import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const PACKAGE_DIR = resolve(__dirname, "..");
const DIST_CLI = join(PACKAGE_DIR, "dist", "index.js");

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

// Same freshness guard as tests/e2e.test.ts: the spawned artifact is
// dist/index.js, so rebuild it when any source file is newer.
function buildCliIfStale(): void {
  const sources = ["index.ts", "templates.ts", "versions.generated.ts"].map(
    (file) => join(PACKAGE_DIR, "src", file),
  );
  const distFresh =
    existsSync(DIST_CLI) &&
    sources.every(
      (source) => statSync(source).mtimeMs <= statSync(DIST_CLI).mtimeMs,
    );
  if (distFresh) return;
  const build = spawnSync(NPM_COMMAND, ["run", "build"], {
    cwd: PACKAGE_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    throw new Error("create-domphy build failed — cannot run CLI tests");
  }
}

function runCli(
  args: string[],
  options: { cwd?: string } = {},
): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, [DIST_CLI, ...args], {
    cwd: options.cwd,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

function readProjectName(projectDir: string): string {
  const parsed = JSON.parse(
    readFileSync(join(projectDir, "package.json"), "utf8"),
  ) as { name: string };
  return parsed.name;
}

const createdDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of createdDirs) {
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 500,
    });
  }
});

buildCliIfStale();

describe("create-domphy CLI", () => {
  it("sanitizes a weird directory name into a valid npm package name", () => {
    const parent = makeTempDir("create-domphy-cli-");
    const projectDir = join(parent, "My Cool App!");
    const run = runCli([projectDir]);
    expect(run.status, run.output).toBe(0);
    expect(readProjectName(projectDir)).toBe("my-cool-app");
    expect(existsSync(join(projectDir, "src", "main.ts"))).toBe(true);
  });

  it("names the project after the current directory when the target is '.'", () => {
    // Regression: scaffolding with "." used to hard-code "domphy-app" as the
    // package name instead of deriving it from the directory the user is in.
    const projectDir = makeTempDir("create-domphy-dot-");
    const run = runCli(["."], { cwd: projectDir });
    expect(run.status, run.output).toBe(0);
    const expected = basename(projectDir).toLowerCase();
    expect(readProjectName(projectDir)).toBe(expected);
    expect(readProjectName(projectDir)).not.toBe("domphy-app");
  });

  it("strips leading dots/underscores npm rejects in package names", () => {
    const parent = makeTempDir("create-domphy-cli-");
    const projectDir = join(parent, "_hidden.app");
    const run = runCli([projectDir]);
    expect(run.status, run.output).toBe(0);
    expect(readProjectName(projectDir)).toBe("hidden.app");
  });

  it("aborts on an existing non-empty directory without touching it", () => {
    const projectDir = makeTempDir("create-domphy-full-");
    writeFileSync(join(projectDir, "keep.txt"), "precious", "utf8");
    const run = runCli([projectDir]);
    expect(run.status).toBe(1);
    expect(run.output).toContain("exists and is not empty");
    expect(readFileSync(join(projectDir, "keep.txt"), "utf8")).toBe("precious");
    expect(existsSync(join(projectDir, "package.json"))).toBe(false);
  });

  it("scaffolds into a directory containing only benign entries (.git)", () => {
    const projectDir = makeTempDir("create-domphy-git-");
    mkdirSync(join(projectDir, ".git"));
    const run = runCli([projectDir]);
    expect(run.status, run.output).toBe(0);
    expect(existsSync(join(projectDir, "src", "main.ts"))).toBe(true);
  });

  it("rejects an unknown template with exit 1", () => {
    const projectDir = join(makeTempDir("create-domphy-cli-"), "app");
    const run = runCli([projectDir, "--template", "nope"]);
    expect(run.status).toBe(1);
    expect(run.output).toContain('Unknown template "nope"');
    expect(existsSync(projectDir)).toBe(false);
  });
});
