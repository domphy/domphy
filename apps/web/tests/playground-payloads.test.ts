// Site-wide playground guard. Collects EVERY <CodeEditor :code=...> payload
// across apps/web/docs/**/*.md — replicating extractEditorIslands() in
// build.press.ts (inline `const Var = \`...\`` templates and `?raw` imports) —
// and validates each the same way the browser playground does:
// transformCode() then `new Function("__modules__", result)` (construct only,
// never executed). A failure here is exactly the production
// `Unexpected identifier 'as'` class of bug: a demo whose transformed code
// is not valid JavaScript. <DomphyPreview> demo sources are also checked to
// exist and parse (they are esbuild-bundled at build time).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform as esbuildTransform } from "esbuild";
import { describe, expect, it } from "vitest";
import { transformCode } from "../docs/editor/transformCode";

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(here, "../docs");

function* walkMarkdown(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walkMarkdown(path);
    else if (entry.endsWith(".md")) yield path;
  }
}

interface EditorPayload {
  label: string;
  code: string;
}

interface PreviewSource {
  label: string;
  path: string;
}

/** Mirrors extractEditorIslands()'s codeMap resolution from build.press.ts. */
function scriptCodeMap(
  script: string,
  fileDir: string,
): Record<string, string> {
  const codeMap: Record<string, string> = {};
  for (const m of script.matchAll(
    /import\s+(\w+)\s+from\s+["']([^"']+\?raw)["']/g,
  )) {
    const absPath = resolve(fileDir, m[2].replace(/\?raw$/, ""));
    if (existsSync(absPath)) codeMap[m[1]] = readFileSync(absPath, "utf8");
  }
  for (const m of script.matchAll(/const\s+(\w+)\s*=\s*`([\s\S]*?)`/g)) {
    codeMap[m[1]] = m[2].trim();
  }
  return codeMap;
}

function collectPlaygrounds(): {
  editors: EditorPayload[];
  previews: PreviewSource[];
} {
  const editors: EditorPayload[] = [];
  const previews: PreviewSource[] = [];
  for (const file of walkMarkdown(docsDir)) {
    const source = readFileSync(file, "utf8");
    const fileDir = dirname(file);
    const scriptMatch = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
    const script = scriptMatch ? scriptMatch[1] : "";
    const codeMap = scriptCodeMap(script, fileDir);
    const rel = file.slice(docsDir.length + 1);

    let editorIndex = 0;
    for (const m of source.matchAll(
      /<CodeEditor\b([^>]*?)(?:\/>|><\/CodeEditor>)/g,
    )) {
      const label = `${rel}#editor-${editorIndex++}`;
      const codeAttr = m[1].match(/:code=["'](\w+)["']/);
      if (!codeAttr) continue;
      const code = codeMap[codeAttr[1]];
      if (code == null) {
        // An unresolved var is itself a broken playground: keep it in the
        // list with a marker the assertion will report.
        editors.push({
          label,
          code: `throw new Error(${JSON.stringify(`unresolved :code var "${codeAttr[1]}"`)})`,
        });
        continue;
      }
      editors.push({ label, code });
    }

    // <DomphyPreview :element="Var" /> — Var is `import Var from "./path.js"`
    // in the script block; esbuild bundles the source at build time.
    const importMap: Record<string, string> = {};
    for (const m of script.matchAll(
      /import\s+(\w+)\s+from\s+["']([^"']+)["']/g,
    )) {
      if (m[2].endsWith("?raw")) continue;
      importMap[m[1]] = m[2];
    }
    let previewIndex = 0;
    for (const m of source.matchAll(
      /<DomphyPreview\b([^>]*?)(?:\/>|><\/DomphyPreview>)/g,
    )) {
      const label = `${rel}#preview-${previewIndex++}`;
      const elementAttr = m[1].match(/:element=["'](\w+)["']/);
      const importPath = elementAttr ? importMap[elementAttr[1]] : undefined;
      if (!importPath) continue;
      let absPath = resolve(fileDir, importPath);
      if (!existsSync(absPath) && absPath.endsWith(".js")) {
        const tsPath = `${absPath.slice(0, -3)}.ts`;
        if (existsSync(tsPath)) absPath = tsPath;
      }
      previews.push({ label, path: absPath });
    }
  }
  return { editors, previews };
}

const { editors, previews } = collectPlaygrounds();

describe("playground payloads", () => {
  it("collects a non-trivial number of editor playgrounds", () => {
    expect(editors.length).toBeGreaterThan(100);
  });

  it("every <CodeEditor> payload compiles via transformCode + new Function", () => {
    const failures: string[] = [];
    for (const { label, code } of editors) {
      try {
        // Construct only — exactly what the playground does before running it
        // in the browser. Never call the resulting function here.
        new Function("__modules__", transformCode(code));
      } catch (error) {
        failures.push(`${label}: ${(error as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("every <DomphyPreview> source exists and parses as TS", async () => {
    const failures: string[] = [];
    for (const { label, path } of previews) {
      if (!existsSync(path)) {
        failures.push(`${label}: source not found: ${path}`);
        continue;
      }
      try {
        await esbuildTransform(readFileSync(path, "utf8"), {
          loader: path.endsWith(".tsx") ? "tsx" : "ts",
        });
      } catch (error) {
        failures.push(`${label}: ${(error as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
