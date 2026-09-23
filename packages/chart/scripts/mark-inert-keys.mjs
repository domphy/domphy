// No shebang: tests/inert-keys-honest.test.ts imports this module, and
// vite does not strip a shebang from an imported .mjs ("SyntaxError: Invalid
// or unexpected token"). Run it as `node scripts/mark-inert-keys.mjs`.
// Stamps a `@deprecated` JSDoc marker above every option key in src/types.ts
// that nothing in src/ reads, and REMOVES it again from any key that has since
// gained a reader. Idempotent: re-running after other work lands is the
// intended way to use it.
//
//   node scripts/mark-inert-keys.mjs           # rewrite src/types.ts
//   node scripts/mark-inert-keys.mjs --check   # dry run, exit 1 if out of date

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sweepInertKeys } from "./inert-keys.mjs";

export const MARKER_TAG = "@deprecated Not implemented by @domphy/chart";
const MARKER_TEXT = `${MARKER_TAG} — ignored. See docs/chart/vs-echarts.md`;

/**
 * The JSDoc block directly above a declaration, if any.
 * @param {string[]} lines @param {number} keyIndex 0-based index of the key line
 * @returns {{ start: number, end: number, single: boolean } | null}
 */
function blockAbove(lines, keyIndex) {
  const end = keyIndex - 1;
  if (end < 0 || !/\*\/\s*$/.test(lines[end])) return null;
  if (/^\s*\/\*\*/.test(lines[end])) return { start: end, end, single: true };
  let start = end;
  while (start >= 0 && !/^\s*\/\*\*/.test(lines[start])) start--;
  return start < 0 ? null : { start, end, single: false };
}

/** Does the declaration at this 1-based line carry the inert marker? */
export function hasInertMarker(lines, lineNumber) {
  const block = blockAbove(lines, lineNumber - 1);
  if (!block) return false;
  return lines
    .slice(block.start, block.end + 1)
    .some((line) => line.includes(MARKER_TAG));
}

/** @returns {boolean} whether anything changed */
function stamp(lines, keyIndex, indent) {
  const block = blockAbove(lines, keyIndex);
  if (!block) {
    lines.splice(keyIndex, 0, `${indent}/** ${MARKER_TEXT} */`);
    return true;
  }
  const blockLines = lines.slice(block.start, block.end + 1);
  if (blockLines.some((line) => line.includes(MARKER_TAG))) return false;
  if (block.single) {
    // Expand `/** text */` into a multi-line block so the existing prose survives.
    const inner = blockLines[0]
      .replace(/^\s*\/\*\*\s?/, "")
      .replace(/\s*\*\/\s*$/, "");
    lines.splice(
      block.start,
      1,
      `${indent}/**`,
      `${indent} * ${inner}`,
      `${indent} * ${MARKER_TEXT}`,
      `${indent} */`,
    );
  } else {
    lines.splice(block.end, 0, `${indent} * ${MARKER_TEXT}`);
  }
  return true;
}

/** @returns {boolean} whether anything changed */
function unstamp(lines, keyIndex) {
  const block = blockAbove(lines, keyIndex);
  if (!block) return false;
  const blockLines = lines.slice(block.start, block.end + 1);
  if (!blockLines.some((line) => line.includes(MARKER_TAG))) return false;
  if (block.single) {
    lines.splice(block.start, 1);
    return true;
  }
  const kept = blockLines.filter((line) => !line.includes(MARKER_TAG));
  const stillSaysSomething = kept
    .slice(1, -1)
    .some((line) => line.replace(/^\s*\*\s?/, "").trim() !== "");
  if (stillSaysSomething) lines.splice(block.start, blockLines.length, ...kept);
  else lines.splice(block.start, blockLines.length);
  return true;
}

/** @param {string} packageRoot @returns {{ text: string, stamped: number, removed: number }} */
export function markInertKeys(packageRoot) {
  const typesPath = path.join(packageRoot, "src", "types.ts");
  const original = fs.readFileSync(typesPath, "utf8");
  const newline = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/);
  const { inert, read } = sweepInertKeys(packageRoot);

  // Bottom-up so earlier line numbers stay valid as lines are spliced in/out.
  const all = [
    ...inert.map((e) => ({ ...e, isInert: true })),
    ...read.map((e) => ({ ...e, isInert: false })),
  ].sort((a, b) => b.line - a.line);
  let stamped = 0;
  let removed = 0;
  for (const entry of all) {
    const keyIndex = entry.line - 1;
    const indent = lines[keyIndex].match(/^(\s*)/)[1];
    if (entry.isInert) {
      if (stamp(lines, keyIndex, indent)) stamped++;
    } else if (unstamp(lines, keyIndex)) removed++;
  }
  return { text: lines.join(newline), stamped, removed };
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  const packageRoot = path.resolve(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  const typesPath = path.join(packageRoot, "src", "types.ts");
  const { text, stamped, removed } = markInertKeys(packageRoot);
  const check = process.argv.includes("--check");
  const current = fs.readFileSync(typesPath, "utf8");
  if (check) {
    console.log(`would stamp ${stamped}, would remove ${removed}`);
    if (text !== current) {
      console.error(
        "src/types.ts is out of date — run `node scripts/mark-inert-keys.mjs`",
      );
      process.exit(1);
    }
  } else {
    if (text !== current) fs.writeFileSync(typesPath, text);
    console.log(`stamped ${stamped}, removed ${removed}`);
  }
}
