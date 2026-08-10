import { writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MermaidOptions } from "../../mermaid/types.js";

// Intercepts the dynamically imported `@mermaid-js/mermaid-cli` so the config
// merge in renderMermaidToSvg can be asserted without launching a browser.
// Kept in its own file: renderer.test.ts's opt-in E2E tests need the real CLI.
const runSpy = vi.fn(
  async (_input: string, output: string, _options?: unknown) => {
    await writeFile(output, "<svg/>", "utf8");
  },
);

vi.mock("@mermaid-js/mermaid-cli", () => ({ run: runSpy }));

const { renderMermaidToSvg } = await import("../../mermaid/renderer.js");

interface CapturedOptions {
  parseMMDOptions?: { mermaidConfig?: Record<string, unknown> };
}

/** Renders once and returns the mermaidConfig forwarded to the CLI. */
async function capturedConfig(
  options?: MermaidOptions,
): Promise<Record<string, unknown>> {
  await renderMermaidToSvg("graph TD; A-->B;", options);
  const call = runSpy.mock.calls.at(-1);
  const captured = (call?.[2] as CapturedOptions | undefined)?.parseMMDOptions
    ?.mermaidConfig;
  expect(captured).toBeDefined();
  return captured as Record<string, unknown>;
}

describe("renderMermaidToSvg mermaid config", () => {
  afterEach(() => {
    runSpy.mockClear();
  });

  it("pins securityLevel to 'strict' when the caller did not specify one", async () => {
    const config = await capturedConfig();
    expect(config.securityLevel).toBe("strict");
    expect(config.theme).toBe("default");
  });

  it("respects an explicit securityLevel override", async () => {
    const config = await capturedConfig({
      mermaidConfig: { securityLevel: "sandbox" },
    });
    expect(config.securityLevel).toBe("sandbox");
  });

  it("merges caller mermaidConfig on top of the defaults", async () => {
    const config = await capturedConfig({
      theme: "dark",
      mermaidConfig: { flowchart: { htmlLabels: false } },
    });
    expect(config.theme).toBe("dark");
    expect(config.securityLevel).toBe("strict");
    expect(config.flowchart).toEqual({ htmlLabels: false });
  });
});
