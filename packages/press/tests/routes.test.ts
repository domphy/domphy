import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverPages, outFileForRoute, routeForFile } from "../src/routes.ts";

let srcDir: string;

beforeEach(() => {
  srcDir = mkdtempSync(join(tmpdir(), "press-routes-"));
});

afterEach(() => {
  rmSync(srcDir, { recursive: true, force: true });
});

describe("routeForFile / outFileForRoute", () => {
  it("maps index.md to the directory route", () => {
    expect(routeForFile("index.md")).toBe("/");
    expect(routeForFile(join("guide", "index.md"))).toBe("/guide/");
    expect(routeForFile("guide.md")).toBe("/guide");
  });

  it("maps routes to output files", () => {
    expect(outFileForRoute("/")).toBe("index.html");
    expect(outFileForRoute("/guide/")).toBe("guide/index.html");
  });
});

describe("discoverPages", () => {
  it("finds markdown pages and skips README.md", () => {
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    writeFileSync(join(srcDir, "README.md"), "# Not a page\n");
    mkdirSync(join(srcDir, "guide"));
    writeFileSync(join(srcDir, "guide", "intro.md"), "# Intro\n");
    const routes = discoverPages(srcDir).map((p) => p.route);
    expect(routes).toEqual(["/", "/guide/intro"]);
  });

  it("never discovers playwright test-results artifacts as pages", () => {
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    mkdirSync(join(srcDir, "test-results", "some-test"), {
      recursive: true,
    });
    writeFileSync(
      join(srcDir, "test-results", "some-test", "error-context.md"),
      "# Error\n",
    );
    const routes = discoverPages(srcDir).map((p) => p.route);
    expect(routes).toEqual(["/"]);
  });
});
