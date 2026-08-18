#!/usr/bin/env node
/**
 * lint-pkg.mjs — package-correctness gate for every publishable package.
 *
 * Runs two linters against each publishable package (packed contents, i.e.
 * what consumers actually install):
 *
 *   1. publint (programmatic API, `pack: "pnpm"`) — package.json / exports /
 *      files correctness. pnpm pack rewrites `workspace:` deps; npm pack
 *      would leave them. Errors and warnings fail the gate; suggestions are
 *      reported as info. A packed `workspace:` value is always an error.
 *   2. @arethetypeswrong/cli (`attw --pack . --format json`) — TypeScript
 *      types resolution across node10 / node16 (CJS & ESM) / bundler. Any
 *      problem fails the gate unless it is listed in ATTW_IGNORES below with
 *      a documented reason.
 *
 * Usage:
 *   node scripts/lint-pkg.mjs [--filter <substr>] [--publint-only|--attw-only]
 *
 * Exit code: 0 when clean, 1 when any package fails (or a tool errors).
 */

import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { publint } from "publint";
import { formatMessage } from "publint/utils";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packagesDir = path.join(rootDir, "packages");
const attwBin = path.join(
  rootDir,
  "node_modules",
  "@arethetypeswrong",
  "cli",
  "dist",
  "index.js",
);

/**
 * Documented attw exemptions. Key: package name; value: rule kind →
 * { reason, resolutionKinds? }. A problem is ignored only when its rule kind
 * matches AND (no resolutionKinds given OR its resolutionKind is listed).
 * Anything outside this list fails the gate. Entries here are deliberate
 * design decisions, not silenced bugs — keep the reasons accurate.
 */
const ATTW_IGNORES = {
  // ESM-only by design: Node CLI built on the ESM-only MCP SDK; a CJS
  // require() consumer is unsupported. node16-cjs and node10 NoResolution
  // are expected; the ESM and bundler profiles are still fully checked.
  "@domphy/mcp": {
    NoResolution: {
      reason:
        "intentionally ESM-only (Node CLI, ESM-only MCP SDK); require() from CJS unsupported by design",
      resolutionKinds: ["node10", "node16-cjs"],
    },
  },
  // ESM-only by design: the Node API uses import.meta.url and top-level
  // await, so it cannot be required from CJS. Same profile coverage as mcp.
  "@domphy/press": {
    NoResolution: {
      reason:
        "intentionally ESM-only (import.meta.url/top-level await in Node API); require() from CJS unsupported by design",
      resolutionKinds: ["node10", "node16-cjs"],
    },
  },
};

/** publint rules downgraded to info (reported, never failing), with reasons. */
const PUBLINT_INFO = {
  // Suggestions are already non-failing by policy; list specific rules here
  // only if they must not fail the gate despite being warnings.
};

const args = process.argv.slice(2);
const filter = args.includes("--filter")
  ? args[args.indexOf("--filter") + 1]
  : null;
const publintOnly = args.includes("--publint-only");
const attwOnly = args.includes("--attw-only");

/** Discover publishable packages (every packages/* dir without private: true). */
function listPublishablePackages() {
  const result = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgJsonPath = path.join(packagesDir, entry.name, "package.json");
    if (!existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    if (pkg.private) continue;
    result.push({
      name: pkg.name,
      dir: path.join(packagesDir, entry.name),
      pkg,
    });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

async function runPublint(pkgDir) {
  const { messages, pkg } = await publint({
    pkgDir,
    pack: "pnpm",
    level: "suggestion",
    strict: false,
  });
  const findings = messages.map((message) => ({
    severity: message.type, // "error" | "warning" | "suggestion"
    code: message.code,
    text: formatMessage(message, pkg),
  }));
  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object") continue;
    for (const [depName, version] of Object.entries(deps)) {
      if (typeof version === "string" && version.includes("workspace:")) {
        findings.push({
          severity: "error",
          code: "workspace-protocol",
          text: `packed ${field}.${depName}=${version} still uses workspace: protocol`,
        });
      }
    }
  }
  return findings;
}

function flattenAttwProblems(problems) {
  if (!problems) return [];
  if (Array.isArray(problems)) return problems;
  // Record keyed by entrypoint subpath.
  return Object.values(problems).flat();
}

async function runAttw(pkgDir) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      process.execPath,
      [attwBin, "--pack", ".", "--format", "json"],
      {
        cwd: pkgDir,
        maxBuffer: 64 * 1024 * 1024,
      },
    ));
  } catch (error) {
    // attw exits non-zero when problems exist — the JSON report is still on
    // STDOUT, so only rethrow when there is no parseable output.
    if (!error.stdout) throw error;
    stdout = error.stdout;
  }
  const json = JSON.parse(stdout);
  return flattenAttwProblems(json.problems);
}

async function lintPackage({ name, dir }) {
  const findings = [];
  if (!attwOnly) {
    for (const m of await runPublint(dir)) {
      const ignored = PUBLINT_INFO[m.code] != null;
      findings.push({
        tool: "publint",
        severity: m.severity === "suggestion" || ignored ? "info" : m.severity,
        rule: m.code,
        message: m.text.replace(/\s+/g, " ").trim(),
      });
    }
  }
  if (!publintOnly) {
    const ignores = ATTW_IGNORES[name] ?? {};
    for (const problem of await runAttw(dir)) {
      const kind = problem.kind ?? problem.rule ?? "unknown";
      const ignore = ignores[kind];
      const ignored =
        ignore &&
        (!ignore.resolutionKinds ||
          ignore.resolutionKinds.includes(problem.resolutionKind));
      const entrypoint = problem.entrypoint
        ? ` (entrypoint ${problem.entrypoint})`
        : "";
      const profile = problem.resolutionKind
        ? ` [${problem.resolutionKind}]`
        : "";
      findings.push({
        tool: "attw",
        severity: ignored ? "ignored" : "error",
        rule: kind,
        message: `${kind}${entrypoint}${profile}${ignored ? ` — ignored: ${ignore.reason}` : ""}`,
      });
    }
  }
  return { name, findings };
}

async function main() {
  if (!existsSync(attwBin)) {
    console.error(
      `attw not found at ${attwBin} — run: pnpm add -Dw publint @arethetypeswrong/cli`,
    );
    process.exit(1);
  }
  let packages = listPublishablePackages();
  if (filter) packages = packages.filter((p) => p.name.includes(filter));
  console.log(
    `Linting ${packages.length} publishable packages (publint + attw, packed contents)...\n`,
  );

  const results = [];
  const concurrency = 4;
  let index = 0;
  async function worker() {
    while (index < packages.length) {
      const pkg = packages[index++];
      try {
        const result = await lintPackage(pkg);
        results.push(result);
        const failing = result.findings.filter(
          (f) => f.severity === "error" || f.severity === "warning",
        );
        console.log(
          `${failing.length === 0 ? "✔" : "✘"} ${result.name} (${result.findings.length} finding${result.findings.length === 1 ? "" : "s"})`,
        );
      } catch (error) {
        results.push({
          name: pkg.name,
          findings: [
            {
              tool: "runner",
              severity: "error",
              rule: "tool-failure",
              message: String(error?.message ?? error),
            },
          ],
        });
        console.log(`✘ ${pkg.name} (tool failure)`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  results.sort((a, b) => a.name.localeCompare(b.name));
  let failed = 0;
  for (const { name, findings } of results) {
    const reportable = findings.filter((f) => f.severity !== "info");
    if (reportable.length === 0) continue;
    console.log(`\n${name}`);
    for (const f of findings) {
      const tag = {
        error: "ERROR  ",
        warning: "WARNING",
        ignored: "IGNORED",
        info: "info   ",
      }[f.severity];
      console.log(`  [${tag}] ${f.tool} ${f.rule}: ${f.message}`);
    }
    if (
      reportable.some((f) => f.severity === "error" || f.severity === "warning")
    )
      failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} packages clean.`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
