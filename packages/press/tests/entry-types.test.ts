import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/** Named exports on a TypeScript entry, including `export type { A, B }`. */
function namedExports(file: string): Set<string> {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }
    for (const element of statement.exportClause.elements) {
      names.add(element.name.text);
    }
  }
  return names;
}

describe("public entry types", () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

  it("re-exports BuildOptions, FeatureConfig, and HeroConfig from the main entry", () => {
    const names = namedExports(join(src, "index.ts"));
    expect(names.has("BuildOptions")).toBe(true);
    expect(names.has("FeatureConfig")).toBe(true);
    expect(names.has("HeroConfig")).toBe(true);
  });

  it("re-exports FeatureConfig and HeroConfig from the browser entry (BuildOptions is Node-only)", () => {
    const names = namedExports(join(src, "browser.ts"));
    expect(names.has("FeatureConfig")).toBe(true);
    expect(names.has("HeroConfig")).toBe(true);
    expect(names.has("BuildOptions")).toBe(false);
  });
});
