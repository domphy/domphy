import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain-JS tooling scripts, no .d.ts
import { sweepInertKeys } from "../scripts/inert-keys.mjs";
// @ts-expect-error -- plain-JS tooling scripts, no .d.ts
import { hasInertMarker } from "../scripts/mark-inert-keys.mjs";

const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("honest types", () => {
  it("the @deprecated markers in src/types.ts match the source grep for readers in src/**/*.ts", () => {
    const lines = fs
      .readFileSync(path.join(packageRoot, "src", "types.ts"), "utf8")
      .split(/\r?\n/);
    const { inert, read } = sweepInertKeys(packageRoot) as {
      inert: { id: string; line: number }[];
      read: { id: string; line: number }[];
    };

    const unmarked = inert
      .filter((entry) => !hasInertMarker(lines, entry.line))
      .map((entry) => `${entry.id} (types.ts:${entry.line})`);
    expect(
      unmarked,
      `No reader in src/ but no @deprecated marker — run \`node scripts/mark-inert-keys.mjs\`:\n  ${unmarked.join("\n  ")}`,
    ).toEqual([]);

    const staleMarker = read
      .filter((entry) => hasInertMarker(lines, entry.line))
      .map((entry) => `${entry.id} (types.ts:${entry.line})`);
    expect(
      staleMarker,
      `Has a reader in src/ but still marked @deprecated — run \`node scripts/mark-inert-keys.mjs\`:\n  ${staleMarker.join("\n  ")}`,
    ).toEqual([]);
  });
});
