/**
 * Behavior tests for root scripts (M126–M132).
 * Run: node --test scripts/scripts.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixtureRoots = [];

after(() => {
  for (const dir of fixtureRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
});

function runScript(scriptName, args = [], options = {}) {
  return spawnSync(
    process.execPath,
    [join(root, "scripts", scriptName), ...args],
    {
      encoding: "utf8",
      cwd: options.cwd ?? root,
      env: options.env ?? process.env,
    },
  );
}

function makeFixtureRoot() {
  const dir = mkdtempSync(join(tmpdir(), "domphy-scripts-"));
  fixtureRoots.push(dir);
  return dir;
}

describe("M126 verify:publish --all", () => {
  test("package.json verify:publish invokes --all", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(
      pkg.scripts["verify:publish"],
      "node scripts/verify-publish.mjs --all",
    );
  });

  test("no args still exits 2 (direct invocation)", () => {
    const result = runScript("verify-publish.mjs");
    assert.equal(result.status, 2);
    assert.match(result.stderr, /usage:/);
  });
});

describe("M127 verify-publish in ci", () => {
  test("package.json ci invokes verify-publish --all", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.match(pkg.scripts.ci, /verify-publish\.mjs --all/);
  });

  test("GitHub CI check job invokes verify-publish --all", () => {
    const yaml = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const checkStart = yaml.indexOf("jobs:\n  check:");
    assert.ok(checkStart >= 0, "check job missing");
    const afterCheck = yaml.slice(checkStart + "jobs:\n  check:".length);
    const nextJob = afterCheck.search(/\n {2}[a-z][\w-]*:/);
    const checkJob = nextJob === -1 ? afterCheck : afterCheck.slice(0, nextJob);
    assert.match(checkJob, /verify-publish\.mjs --all|pnpm verify:publish/);
  });
});

describe("M128 stable-readiness version column", () => {
  test("matching Version column exits 0", () => {
    const fixture = makeFixtureRoot();
    mkdirSync(join(fixture, "packages", "widget"), { recursive: true });
    writeFileSync(
      join(fixture, "packages", "widget", "package.json"),
      JSON.stringify({ name: "@tmp/widget", version: "1.2.3" }),
    );
    writeFileSync(
      join(fixture, "packages", "widget", "CHANGELOG.md"),
      "# widget\n",
    );
    writeFileSync(
      join(fixture, "STABLE-READINESS.md"),
      [
        "## Peer matrix",
        "",
        "| Package | Version | React / ecosystem peers | P0 | P1 | P2 | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| `@tmp/widget` | 1.2.3 | none | none | — | — | ok |",
        "",
        "### Other",
        "",
        "| ID | Package | Gap | Resolution |",
        "| P0-X | all | n/a | n/a |",
        "",
      ].join("\n"),
    );
    const result = runScript("stable-readiness-check.mjs", ["--root", fixture]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /@tmp\/widget@1\.2\.3/);
  });

  test("stale Version column exits 1", () => {
    const fixture = makeFixtureRoot();
    mkdirSync(join(fixture, "packages", "widget"), { recursive: true });
    writeFileSync(
      join(fixture, "packages", "widget", "package.json"),
      JSON.stringify({ name: "@tmp/widget", version: "1.2.3" }),
    );
    writeFileSync(
      join(fixture, "packages", "widget", "CHANGELOG.md"),
      "# widget\n",
    );
    writeFileSync(
      join(fixture, "STABLE-READINESS.md"),
      [
        "## Peer matrix",
        "",
        "| Package | Version | React / ecosystem peers | P0 | P1 | P2 | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "| `@tmp/widget` | 1.0.0 | none | none | — | — | stale |",
        "",
      ].join("\n"),
    );
    const result = runScript("stable-readiness-check.mjs", ["--root", fixture]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /STALE MATRIX VERSION/);
    assert.match(result.stderr, /@tmp\/widget/);
    assert.match(result.stderr, /1\.0\.0/);
    assert.match(result.stderr, /1\.2\.3/);
  });

  test("name present but no peer-matrix row still missing", () => {
    const fixture = makeFixtureRoot();
    mkdirSync(join(fixture, "packages", "widget"), { recursive: true });
    writeFileSync(
      join(fixture, "packages", "widget", "package.json"),
      JSON.stringify({ name: "@tmp/widget", version: "1.2.3" }),
    );
    writeFileSync(
      join(fixture, "packages", "widget", "CHANGELOG.md"),
      "# widget\n",
    );
    writeFileSync(
      join(fixture, "STABLE-READINESS.md"),
      [
        "# Notes mentioning `@tmp/widget` 1.2.3",
        "",
        "## Peer matrix",
        "",
        "| Package | Version | React / ecosystem peers | P0 | P1 | P2 | Notes |",
        "| --- | --- | --- | --- | --- | --- | --- |",
        "",
      ].join("\n"),
    );
    const result = runScript("stable-readiness-check.mjs", ["--root", fixture]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /MISSING FROM MATRIX/);
    assert.match(result.stderr, /@tmp\/widget/);
  });
});

describe("M129 GitHub check includes stable-readiness-check", () => {
  test("jobs.check runs stable-readiness-check", () => {
    const yaml = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const checkStart = yaml.indexOf("jobs:\n  check:");
    assert.ok(checkStart >= 0, "check job missing");
    const afterCheck = yaml.slice(checkStart + "jobs:\n  check:".length);
    const nextJob = afterCheck.search(/\n {2}[a-z][\w-]*:/);
    const checkJob = nextJob === -1 ? afterCheck : afterCheck.slice(0, nextJob);
    assert.match(checkJob, /stable-readiness-check\.mjs/);
  });
});

describe("M130 lint-pkg pack:pnpm", () => {
  test("publint packs with pnpm, not npm", () => {
    const source = readFileSync(join(root, "scripts", "lint-pkg.mjs"), "utf8");
    assert.match(source, /pack:\s*"pnpm"/);
    assert.doesNotMatch(source, /pack:\s*"npm"/);
  });

  test("fails when packed package.json still has workspace:", () => {
    const source = readFileSync(join(root, "scripts", "lint-pkg.mjs"), "utf8");
    assert.match(source, /workspace:/);
    assert.match(
      source,
      /workspace-protocol|WORKSPACE_PROTOCOL|workspace: protocol/,
    );
  });
});

describe("M131 guard-pnpm-publish real package manager", () => {
  function guardEnv(overrides) {
    return {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      ...overrides,
    };
  }

  test("spoofed npm_config_user_agent with npm execpath exits 1", () => {
    const result = runScript("guard-pnpm-publish.mjs", [], {
      env: guardEnv({
        npm_config_user_agent: "pnpm/10.24.0 npm/? node/v22.0.0 win32 x64",
        npm_execpath: "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js",
        npm_command: "publish",
      }),
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pnpm/);
  });

  test("real pnpm execpath exits 0 even if user-agent looks like npm", () => {
    const result = runScript("guard-pnpm-publish.mjs", [], {
      env: guardEnv({
        npm_config_user_agent: "npm/10.9.0 node/v22.0.0 win32 x64",
        npm_execpath:
          "C:/Users/x/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs",
        npm_command: "publish",
      }),
    });
    assert.equal(result.status, 0, result.stderr);
  });

  test("empty env exits 1", () => {
    const result = runScript("guard-pnpm-publish.mjs", [], {
      env: guardEnv({}),
    });
    assert.equal(result.status, 1);
  });
});

describe("M132 vite-app skipLibCheck", () => {
  test("tsconfig does not skip lib check", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(root, "smoke/fixtures/vite-app/tsconfig.json"), "utf8"),
    );
    assert.equal(tsconfig.compilerOptions.skipLibCheck, false);
  });
});
