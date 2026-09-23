/**
 * Two-way enforcement for KNOWN_DEBT.md: every `// ledger:<id>` marker in the
 * source tree must have a matching `` `ledger:<id>` `` line in KNOWN_DEBT.md,
 * and every line in KNOWN_DEBT.md must have a matching marker still in the
 * source. A marker with no ledger line is undocumented debt; a ledger line
 * with no marker is a dead note (the fix landed, or the marker was removed,
 * and nobody updated the ledger) — CLAUDE.md's "no sổ ảo" rule.
 * Run: node --test scripts/known-debt.test.mjs
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

// Directories never worth walking: dependencies, build output, VCS metadata.
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".turbo",
  ".vite",
  "coverage",
  ".serve",
]);

// Source extensions a `// ledger:` code comment can live in. This repo is
// TypeScript end to end; `.json` is included because tsconfig.json files are
// parsed as JSONC by tsc (comments allowed) and are a legitimate marker site
// for config-level debt (e.g. a narrow `include`).
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"]);

const MARKER_RE = /\/\/\s*ledger:([a-z0-9][a-z0-9-]*)/g;
const LEDGER_LINE_RE = /`ledger:([a-z0-9][a-z0-9-]*)`/g;

function walk(dir, files) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, files);
    } else if (SOURCE_EXTS.has(extname(entry))) {
      files.push(path);
    }
  }
}

/** Every `// ledger:<id>` marker found in the source tree, id -> file:line. */
function findMarkers() {
  const files = [];
  walk(root, files);
  const markers = new Map();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const match of lines[i].matchAll(MARKER_RE)) {
        const id = match[1];
        const site = `${file.slice(root.length + 1).replaceAll("\\", "/")}:${i + 1}`;
        if (markers.has(id)) {
          markers.get(id).push(site);
        } else {
          markers.set(id, [site]);
        }
      }
    }
  }
  return markers;
}

/** Every `` `ledger:<id>` `` id documented in KNOWN_DEBT.md. */
function findLedgerLines() {
  const text = readFileSync(join(root, "KNOWN_DEBT.md"), "utf8");
  const ids = new Set();
  for (const match of text.matchAll(LEDGER_LINE_RE)) {
    ids.add(match[1]);
  }
  return ids;
}

describe("KNOWN_DEBT.md two-way ledger enforcement", () => {
  test("KNOWN_DEBT.md exists at the repo root", () => {
    assert.doesNotThrow(() =>
      readFileSync(join(root, "KNOWN_DEBT.md"), "utf8"),
    );
  });

  test("every `// ledger:<id>` marker in source has a matching KNOWN_DEBT.md line", () => {
    const markers = findMarkers();
    const documented = findLedgerLines();
    const undocumented = [...markers.keys()].filter(
      (id) => !documented.has(id),
    );
    assert.deepEqual(
      undocumented,
      [],
      `Marker(s) with no KNOWN_DEBT.md line: ${undocumented
        .map((id) => `${id} (${markers.get(id).join(", ")})`)
        .join("; ")}`,
    );
  });

  test("every KNOWN_DEBT.md line has a matching marker still in source", () => {
    const markers = findMarkers();
    const documented = findLedgerLines();
    const stale = [...documented].filter((id) => !markers.has(id));
    assert.deepEqual(
      stale,
      [],
      `KNOWN_DEBT.md line(s) with no marker left in source (fixed and not removed from the ledger, or the marker text drifted): ${stale.join(", ")}`,
    );
  });

  test("no marker id is duplicated at more than one site", () => {
    const markers = findMarkers();
    const duplicated = [...markers.entries()].filter(
      ([, sites]) => sites.length > 1,
    );
    assert.deepEqual(
      duplicated,
      [],
      `Marker id(s) placed at more than one site — ids must be unique: ${duplicated
        .map(([id, sites]) => `${id} (${sites.join(", ")})`)
        .join("; ")}`,
    );
  });
});
