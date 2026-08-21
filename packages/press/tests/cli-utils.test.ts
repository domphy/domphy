import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadConfig,
  parseFlags,
  parsePort,
  watchTree,
} from "../src/cli-utils.ts";

describe("parseFlags", () => {
  it("parses --flag value form", () => {
    const { flags, unknown } = parseFlags(
      ["--port", "4000", "--out", "dist"],
      ["--port", "--out"],
    );
    expect(flags["--port"]).toBe("4000");
    expect(flags["--out"]).toBe("dist");
    expect(unknown).toEqual([]);
  });

  it("parses --flag=value form", () => {
    const { flags } = parseFlags(["--port=4000"], ["--port"]);
    expect(flags["--port"]).toBe("4000");
  });

  it("collects unknown flags for warning", () => {
    const { flags, unknown } = parseFlags(
      ["--port", "4000", "--verbose", "--wat=1"],
      ["--port"],
    );
    expect(flags["--port"]).toBe("4000");
    expect(unknown).toEqual(["--verbose", "--wat"]);
  });

  it("treats a flag followed by another flag as valueless", () => {
    const { flags } = parseFlags(
      ["--out", "--port", "4000"],
      ["--out", "--port"],
    );
    expect(flags["--out"]).toBeUndefined();
    expect(flags["--port"]).toBe("4000");
  });
});

describe("parsePort", () => {
  it("returns the fallback when no value is given", () => {
    expect(parsePort(undefined, 3000)).toBe(3000);
  });

  it("accepts a valid port", () => {
    expect(parsePort("8080", 3000)).toBe(8080);
  });

  it("rejects non-numeric input instead of passing NaN to listen()", () => {
    expect(() => parsePort("abc", 3000)).toThrow(/Invalid --port/);
  });

  it("rejects out-of-range and fractional ports", () => {
    expect(() => parsePort("0", 3000)).toThrow(/Invalid --port/);
    expect(() => parsePort("70000", 3000)).toThrow(/Invalid --port/);
    expect(() => parsePort("3000.5", 3000)).toThrow(/Invalid --port/);
  });
});

describe("loadConfig", () => {
  let dir: string;

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads a TypeScript config via esbuild (works without tsx / Node type stripping)", async () => {
    dir = mkdtempSync(join(tmpdir(), "press-config-"));
    // TS-only syntax (interface + type annotation) proves the file was
    // transpiled — a plain `import()` of this file throws
    // ERR_UNKNOWN_FILE_EXTENSION on Node < 22.18.
    writeFileSync(
      join(dir, "press.config.ts"),
      [
        "interface ConfigShape { title: string }",
        'const config: ConfigShape = { title: "Loaded From TS" };',
        "export default config;",
      ].join("\n"),
    );
    const config = await loadConfig("press.config.ts", dir);
    expect(config.title).toBe("Loaded From TS");
  }, 15_000);

  it("supports a config exported as a function", async () => {
    dir = mkdtempSync(join(tmpdir(), "press-config-"));
    writeFileSync(
      join(dir, "press.config.ts"),
      'export default () => ({ title: "From Function" });\n',
    );
    const config = await loadConfig("press.config.ts", dir);
    expect(config.title).toBe("From Function");
  });

  it("reports a missing config with an actionable message", async () => {
    dir = mkdtempSync(join(tmpdir(), "press-config-"));
    await expect(loadConfig("press.config.ts", dir)).rejects.toThrow(
      /Config not found/,
    );
  });

  it("wraps syntax errors in a clear message, not a raw stack", async () => {
    dir = mkdtempSync(join(tmpdir(), "press-config-"));
    writeFileSync(join(dir, "press.config.ts"), "export default {{{\n");
    await expect(loadConfig("press.config.ts", dir)).rejects.toThrow(
      /Failed to load press\.config\.ts/,
    );
  });
});

describe("watchTree", () => {
  it("fires onChange for file modifications", async () => {
    const dir = mkdtempSync(join(tmpdir(), "press-watch-"));
    try {
      const changed = new Promise<string>((resolvePromise, reject) => {
        const watchers = watchTree(dir, (filename) => {
          for (const watcher of watchers) watcher.close();
          resolvePromise(filename);
        });
        setTimeout(() => reject(new Error("watch timed out")), 5000);
        // Write after the watcher had a tick to register.
        setTimeout(() => writeFileSync(join(dir, "page.md"), "# Hi\n"), 100);
      });
      await expect(changed).resolves.toContain("page.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 10_000);
});
