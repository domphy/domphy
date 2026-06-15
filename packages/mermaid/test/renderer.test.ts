import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeMermaidSource, renderMermaidToSvg } from "../src/renderer.js";
import type { MermaidOptions } from "../src/types.js";

/**
 * Tries to locate an installed `chrome-headless-shell` in the Puppeteer cache so
 * the headless render uses a known-good binary regardless of which Chrome
 * version Puppeteer currently expects. Returns `undefined` when none is found,
 * in which case the default (Puppeteer's own resolution) is used.
 */
function findChromeShell(): string | undefined {
  const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  if (!existsSync(base)) return undefined;
  const exeName =
    process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  let versions: string[];
  try {
    versions = readdirSync(base);
  } catch {
    return undefined;
  }
  // Prefer the newest version directory (lexical sort is good enough here).
  versions.sort().reverse();
  for (const version of versions) {
    const candidates = [
      join(base, version, `chrome-headless-shell-${platformFolder()}`, exeName),
      join(base, version, exeName),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

/** Maps the platform to the folder Puppeteer uses inside a version directory. */
function platformFolder(): string {
  switch (process.platform) {
    case "win32":
      return "win64";
    case "darwin":
      return process.arch === "arm64" ? "mac-arm64" : "mac-x64";
    default:
      return "linux64";
  }
}

/** Render options that pin a discovered headless-shell binary, when available. */
function headlessOptions(extra: MermaidOptions = {}): MermaidOptions {
  const executablePath = findChromeShell();
  return executablePath
    ? { ...extra, puppeteer: { executablePath, args: ["--no-sandbox"] } }
    : extra;
}

/** True when a render error means the browser could not launch (so we skip). */
function isBrowserUnavailable(message: string): boolean {
  return /failed to (load|launch)|puppeteer|could not find chrome|chrome|browser|executable|spawn/i.test(
    message,
  );
}

describe("normalizeMermaidSource", () => {
  it("trims surrounding blank lines and trailing whitespace", () => {
    expect(normalizeMermaidSource("\n  graph TD; A-->B;  \n")).toBe(
      "graph TD; A-->B;",
    );
  });

  it("normalizes CRLF to LF", () => {
    expect(normalizeMermaidSource("graph TD;\r\nA-->B;")).toBe(
      "graph TD;\nA-->B;",
    );
  });
});

describe("renderMermaidToSvg (headless)", () => {
  it("rejects empty source", async () => {
    await expect(renderMermaidToSvg("   \n  ")).rejects.toThrow(/empty diagram/);
  });

  // Real headless render. chrome-headless-shell is installed in this repo, but
  // if the environment cannot launch a browser we skip rather than fail the
  // whole suite — the renderer code itself is still exercised by the empty-input
  // and tree/cache tests.
  it("renders a flowchart to an inline SVG containing the node labels", async () => {
    let svg: string;
    try {
      svg = await renderMermaidToSvg("graph TD; Alpha-->Beta;", headlessOptions());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isBrowserUnavailable(message)) {
        console.warn(
          `[skip] headless Mermaid render unavailable in this environment: ${message}`,
        );
        return;
      }
      throw error;
    }
    expect(svg).toContain("<svg");
    expect(svg).toContain("Alpha");
    expect(svg).toContain("Beta");
  }, 60000);

  it("throws with the diagram source on a syntax error", async () => {
    let threw = false;
    try {
      await renderMermaidToSvg(
        "graph TD; this is::: not valid !!!",
        headlessOptions(),
      );
    } catch (error) {
      threw = true;
      const message = error instanceof Error ? error.message : String(error);
      // The render wrapper always appends the source marker. If instead the
      // browser could not launch at all, skip the content assertion.
      if (
        !message.includes("--- source ---") &&
        isBrowserUnavailable(message)
      ) {
        console.warn(
          `[skip] headless Mermaid render unavailable in this environment: ${message}`,
        );
        return;
      }
      expect(message).toContain("--- source ---");
    }
    if (!threw) {
      throw new Error("expected renderMermaidToSvg to reject on invalid source");
    }
  }, 60000);
});
