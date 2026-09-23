// No shebang: tests/inert-keys-honest.test.ts imports this module, and
// vite does not strip a shebang from an imported .mjs ("SyntaxError: Invalid
// or unexpected token"). Run it as `node scripts/inert-keys.mjs`.
// Reader sweep: which option keys declared in src/types.ts does the engine
// actually read anywhere in src/?  A key nobody reads is a silently-ignored
// option — a lie in the public type surface.
//
// Definition of a "read" (deliberately crude, deliberately generous — it
// over-reports readers rather than under-reports them, so a key called inert
// here really is inert): the key name appearing in any src/**/*.ts other than
// types.ts as `.name`, `["name"]`, `['name']` or `` `name` ``.
//
// The src/ walk is done at run time (never a hardcoded file list) so readers
// landing in a brand-new module are picked up on the next run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** @param {string} dir @returns {string[]} */
function walkTypeScript(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkTypeScript(full));
    else if (entry.name.endsWith(".ts") && entry.name !== "types.ts")
      found.push(full);
  }
  return found;
}

// Hand-verified exceptions, by `Interface.key`. The regex above only sees a
// key that is DOTTED somewhere; these are populated or consumed through a
// shorthand object literal / destructured parameter, so the sweep would call
// them inert and the codemod would stamp a false "not implemented" on a field
// the engine really does fill in. Each one carries its provenance — add here
// only after opening the line.
const READ_DESPITE_REGEX = new Set([
  "LabelParams.percent", // written: src/engine.ts `percent: Math.round(...)`
  "TooltipParams.percent", // written: src/engine.ts (pie params)
  "TooltipParams.componentType", // written: src/engine.ts `componentType: "series"`
  "TooltipParams.seriesType", // written: src/engine.ts `seriesType: s.type ?? ""`
  "ResolvedCartesian.xAxes", // shorthand in src/engine.ts, read as a param in src/coord/grid.ts
  "ResolvedCartesian.yAxes", // same
  "ScaleInstance.domain", // shorthand in src/scale/{linear,log,ordinal}.ts
  "EncodeOption.itemName", // read: src/dataset/transform.ts `encodeField(encode, "itemName")`
  "CustomRenderParams.seriesId", // written: src/overlay/custom.ts `seriesId: s.id ?? ""` — a terminal param handed to the user's renderItem, never dotted back inside src/
  "SelectChangedParams.isFromClick", // written: src/engine.ts emitSelectChanged (`isFromClick: true`)
]);

/**
 * The reader sweep matches a key NAME anywhere in src/, so one implemented
 * reader would clear the same name on every interface that declares it. The
 * interaction states (src/itemStates.ts) are exactly that case: they are wired
 * into every render path listed below (bar/line/scatter/pie's WebGL renderers
 * plus the SVG label+symbol pass; radar/heatmap/candlestick/gauge's own WebGL
 * or SVG renderers; boxplot/funnel's SVG overlays, opacity only — see
 * CHANGELOG.md's "Interaction states" entry for that scope boundary), and
 * nowhere else. On any OTHER interface these keys are still inert, so they
 * are forced back. `EmphasisOption`'s own keys stay "read" — that is the
 * object the supported series resolve.
 */
const STATE_KEYS = new Set([
  "emphasis",
  "blur",
  "select",
  "selectedMode",
  "selectedOffset",
  "legendHoverLink",
]);
const STATE_INTERFACES = new Set([
  "LineSeriesOption",
  "BarSeriesOption",
  "ScatterSeriesOption",
  "PieSeriesOption",
  "RadarSeriesOption",
  "HeatmapSeriesOption",
  "CandlestickSeriesOption",
  "GaugeSeriesOption",
  "BoxplotSeriesOption",
  "FunnelSeriesOption",
]);

/**
 * @typedef {{ id: string, interface: string, key: string, line: number }} KeyEntry
 * @param {string} packageRoot
 * @returns {{ inert: KeyEntry[], read: KeyEntry[] }}
 */
export function sweepInertKeys(packageRoot) {
  const sourceDir = path.join(packageRoot, "src");
  const lines = fs
    .readFileSync(path.join(sourceDir, "types.ts"), "utf8")
    .split(/\r?\n/);

  /** @type {KeyEntry[]} */
  const declared = [];
  let owner = "";
  for (let index = 0; index < lines.length; index++) {
    const header = lines[index].match(/^export (?:interface|type) (\w+)/);
    if (header) owner = header[1];
    // Top level of the interface only (exactly two spaces of indent).
    const property = lines[index].match(/^\s{2}(\w+)\??\s*:/);
    if (property) {
      declared.push({
        id: `${owner}.${property[1]}`,
        interface: owner,
        key: property[1],
        line: index + 1,
      });
    }
  }

  const body = walkTypeScript(sourceDir)
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  /** @type {Map<string, boolean>} */
  const hasReader = new Map();
  for (const entry of declared) {
    if (hasReader.has(entry.key)) continue;
    hasReader.set(
      entry.key,
      new RegExp(`(?:\\.|\\["|\\['|\`)${entry.key}\\b`).test(body),
    );
  }

  const isRead = (entry) => {
    if (STATE_KEYS.has(entry.key) && !STATE_INTERFACES.has(entry.interface))
      return false;
    return hasReader.get(entry.key) || READ_DESPITE_REGEX.has(entry.id);
  };
  return {
    inert: declared.filter((entry) => !isRead(entry)),
    read: declared.filter(isRead),
  };
}

/**
 * The keys engine.ts additionally warns about at runtime — read out of the
 * source so the docs table and the warn tables can never drift apart.
 * @param {string} packageRoot
 * @returns {Set<string>}
 */
export function warnedKeys(packageRoot) {
  const engine = fs.readFileSync(
    path.join(packageRoot, "src", "engine.ts"),
    "utf8",
  );
  const warned = new Set();
  for (const table of ["UNSUPPORTED_SERIES_KEYS", "UNSUPPORTED_TOOLTIP_KEYS"]) {
    // Sliced, not regexed: the table is a plain `NAME = [ "a", "b" ] as const`.
    const start = engine.indexOf(`${table} = [`);
    if (start === -1) continue;
    const end = engine.indexOf("]", start);
    for (const hit of engine.slice(start, end).matchAll(/"(\w+)"/g))
      warned.add(hit[1]);
  }
  return warned;
}

/**
 * The "no effect" table in apps/web/docs/chart/vs-echarts.md, regenerated from
 * the sweep: `node scripts/inert-keys.mjs --markdown`.
 * @param {string} packageRoot
 * @returns {string}
 */
export function inertMarkdownTable(packageRoot) {
  const { inert } = sweepInertKeys(packageRoot);
  const warned = warnedKeys(packageRoot);
  /** @type {Map<string, string[]>} */
  const grouped = new Map();
  for (const entry of inert) {
    if (!grouped.has(entry.interface)) grouped.set(entry.interface, []);
    grouped
      .get(entry.interface)
      .push(
        warned.has(entry.key) ? `**\`${entry.key}\`**` : `\`${entry.key}\``,
      );
  }
  const rows = [...grouped].map(
    ([owner, keys]) => `| \`${owner}\` | ${keys.length} | ${keys.join(", ")} |`,
  );
  return ["| Type | # | Keys with no effect |", "|---|---:|---|", ...rows].join(
    String.fromCharCode(10),
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const packageRoot = path.resolve(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  if (process.argv.includes("--markdown")) {
    console.log(inertMarkdownTable(packageRoot));
    process.exit(0);
  }
  const { inert, read } = sweepInertKeys(packageRoot);
  /** @type {Map<string, string[]>} */
  const grouped = new Map();
  for (const entry of inert) {
    if (!grouped.has(entry.interface)) grouped.set(entry.interface, []);
    grouped.get(entry.interface).push(`${entry.key}:${entry.line}`);
  }
  for (const [owner, keys] of grouped)
    console.log(`${owner} (${keys.length}): ${keys.join(", ")}`);
  console.log(
    `\ndeclared ${inert.length + read.length}  read ${read.length}  inert ${inert.length}  interfaces-with-inert ${grouped.size}`,
  );
}
