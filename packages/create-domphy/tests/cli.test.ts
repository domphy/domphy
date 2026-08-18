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
import { writeScaffoldFiles } from "../src/write.ts";

const PACKAGE_DIR = resolve(__dirname, "..");
const DIST_CLI = join(PACKAGE_DIR, "dist", "index.js");

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

// Same freshness guard as tests/e2e.test.ts: the spawned artifact is
// dist/index.js, so rebuild it when any source file is newer. Use
// build:bundle (tsup only) — `npm run build` would regenerate
// src/versions.generated.ts as a test side-effect.
function buildCliIfStale(): void {
  const sources = [
    "index.ts",
    "templates.ts",
    "versions.generated.ts",
    "write.ts",
  ].map((file) => join(PACKAGE_DIR, "src", file));
  const distFresh =
    existsSync(DIST_CLI) &&
    sources.every(
      (source) =>
        existsSync(source) &&
        statSync(source).mtimeMs <= statSync(DIST_CLI).mtimeMs,
    );
  if (distFresh) return;
  const build = spawnSync(NPM_COMMAND, ["run", "build:bundle"], {
    cwd: PACKAGE_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    throw new Error("create-domphy bundle failed — cannot run CLI tests");
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

  it("does not overwrite an existing .gitignore", () => {
    // A dir with only .gitignore is treated as empty-enough so `git init` +
    // a user ignore file can still be scaffolded into — but that file is
    // the user's, not a blank canvas. Overwriting it used to clobber
    // whatever they already listed.
    const projectDir = makeTempDir("create-domphy-gitignore-");
    const original = "# user ignore\nsecret\n";
    writeFileSync(join(projectDir, ".gitignore"), original, "utf8");
    const run = runCli([projectDir]);
    expect(run.status, run.output).toBe(0);
    expect(readFileSync(join(projectDir, ".gitignore"), "utf8")).toBe(original);
    expect(existsSync(join(projectDir, "src", "main.ts"))).toBe(true);
  });

  it("rolls back created directories when a later write fails", () => {
    // Mid-scaffold failure used to delete written files but leave mkdir'd
    // parents (src/). A retry then hit isDirectoryUsable's "not empty"
    // check and could not recover. Plant a directory on a later path so
    // writeFileSync throws after src/ has been created.
    const projectDir = makeTempDir("create-domphy-rollback-");
    mkdirSync(join(projectDir, ".git"));
    mkdirSync(join(projectDir, "tsconfig.json"));
    expect(() =>
      writeScaffoldFiles(projectDir, [
        { path: "package.json", contents: "{}\n" },
        { path: "src/main.ts", contents: "export {}\n" },
        { path: "tsconfig.json", contents: "{}\n" },
      ]),
    ).toThrow();
    expect(existsSync(join(projectDir, "package.json"))).toBe(false);
    expect(existsSync(join(projectDir, "src"))).toBe(false);
    expect(existsSync(join(projectDir, ".git"))).toBe(true);
    expect(existsSync(join(projectDir, "tsconfig.json"))).toBe(true);
  });

  it("removes a newly created target directory when a later write fails", () => {
    const parent = makeTempDir("create-domphy-rollback-new-");
    const projectDir = join(parent, "brand-new");
    expect(() =>
      writeScaffoldFiles(projectDir, [
        { path: "src", contents: "not-a-directory\n" },
        { path: "src/main.ts", contents: "export {}\n" },
      ]),
    ).toThrow();
    expect(existsSync(projectDir)).toBe(false);
  });

  it("rebuilds a stale dist via tsup only, without regenerating versions.generated.ts", () => {
    // `npm run build` runs generate:versions first, which rewrites
    // src/versions.generated.ts. Tests must bundle from the committed
    // source so a rebuild is not a hidden source mutation.
    const helper = readFileSync(join(__dirname, "cli.test.ts"), "utf8");
    expect(helper).toContain("build:bundle");
    expect(helper).not.toMatch(/["']run["'],\s*\[["']build["']\]/);
    const e2e = readFileSync(join(__dirname, "e2e.test.ts"), "utf8");
    expect(e2e).toContain("build:bundle");
    expect(e2e).not.toMatch(/["']run["'],\s*\[["']build["']\]/);
    const packageJson = JSON.parse(
      readFileSync(join(PACKAGE_DIR, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts["build:bundle"]).toMatch(/^tsup\b/);
    expect(packageJson.scripts.build).toContain("generate:versions");
    expect(packageJson.scripts.test).not.toContain("generate:versions");
  });

  it("rejects an unknown template with exit 1", () => {
    const projectDir = join(makeTempDir("create-domphy-cli-"), "app");
    const run = runCli([projectDir, "--template", "nope"]);
    expect(run.status).toBe(1);
    expect(run.output).toContain('Unknown template "nope"');
    expect(existsSync(projectDir)).toBe(false);
  });
});
