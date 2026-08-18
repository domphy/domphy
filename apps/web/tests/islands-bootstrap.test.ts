// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../islands-runtime.ts";

const runtimeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../islands-runtime.ts"),
  "utf8",
);

beforeEach(() => {
  document.body.innerHTML = "";
  delete (window as unknown as { __DP_PAGE_ISLANDS__?: unknown })
    .__DP_PAGE_ISLANDS__;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("bootstrap", () => {
  it("wraps mountEditor and the preview loader in .catch", () => {
    expect(runtimeSource).toMatch(/mountEditor\([\s\S]*?\)\.catch\(/);
    expect(runtimeSource).toMatch(/loader\(\)[\s\S]*?\.catch\(/);
  });

  it("catches a rejecting preview loader and console.errors instead of leaving an unhandled rejection", async () => {
    document.body.innerHTML = '<div data-island="preview-0"></div>';
    (
      window as unknown as { __DP_PAGE_ISLANDS__: unknown }
    ).__DP_PAGE_ISLANDS__ = [
      { kind: "preview", id: "preview-0", source: "/missing-demo" },
    ];
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    bootstrap({
      "/missing-demo": () => Promise.reject(new Error("load failed")),
    });
    await flush();
    await flush();

    process.off("unhandledRejection", onUnhandled);
    expect(rejections).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    const message = String(errorSpy.mock.calls[0]?.[0] ?? "");
    expect(message).toContain("preview-0");
    expect(message).toContain("preview");
  });
});
