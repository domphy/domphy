import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleToolCall, SERVER_VERSION } from "../src/handler";
import { diagnoseTree, fixTree, validateTree } from "../src/tools";

const manifest = {
  version: "0.9.0",
  packages: [],
  patches: [
    {
      name: "button",
      hostTag: "button",
      signature: "button()",
      doc: "",
      source: "packages/ui/src/patches/button.ts",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("SERVER_VERSION", () => {
  it("always equals the version in package.json (no manual re-sync)", () => {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "../package.json"), "utf8"),
    ) as { version: string };
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});

describe("handleToolCall argument validation", () => {
  it('returns a structured missing-argument error instead of coercing to "undefined"', async () => {
    for (const [tool, arg] of [
      ["domphy_get_patch", "name"],
      ["domphy_diagnose", "element"],
      ["domphy_validate", "element"],
      ["domphy_fix", "element"],
      ["domphy_get_app_block", "name"],
    ] as const) {
      const result = await handleToolCall(tool, {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`Missing argument: "${arg}"`);
    }
  });

  it("treats undefined arguments and non-string values as missing", async () => {
    const noArgs = await handleToolCall("domphy_diagnose", undefined);
    expect(noArgs.isError).toBe(true);
    expect(noArgs.content[0].text).toContain('Missing argument: "element"');

    const wrongType = await handleToolCall("domphy_diagnose", { element: 42 });
    expect(wrongType.isError).toBe(true);
    expect(wrongType.content[0].text).toContain('Missing argument: "element"');
  });

  it("survives a hostile non-object arguments payload", async () => {
    const result = await handleToolCall(
      "domphy_fix",
      "42" as unknown as Record<string, unknown>,
    );
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing argument: "element"');
  });

  it("flags unknown tools as errors", async () => {
    const result = await handleToolCall("domphy_nope", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Unknown tool: domphy_nope");
  });

  it("runs a valid call without isError", async () => {
    const result = await handleToolCall("domphy_diagnose", {
      element: JSON.stringify({ div: "hi" }),
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("No issues found");
  });

  it("marks JSON parse failures as isError for every doctor tool", async () => {
    for (const tool of [
      "domphy_diagnose",
      "domphy_validate",
      "domphy_fix",
    ] as const) {
      const result = await handleToolCall(tool, { element: "{not json" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid JSON");
    }
  });

  it("marks non-object JSON roots as isError", async () => {
    for (const json of ["42", '"hi"', "null", "[1,2]", "true"]) {
      const result = await handleToolCall("domphy_diagnose", { element: json });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid JSON");
      expect(result.content[0].text).toContain(
        "expected an object element tree",
      );
    }
  });

  it("does not flag a successful diagnose that found issues as isError", async () => {
    const result = await handleToolCall("domphy_diagnose", {
      element: JSON.stringify({ input: "oops" }),
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("void-content");
  });
});

describe("hostile element-tree input (doctor tools)", () => {
  it.each([
    "42",
    '"hi"',
    "null",
    "[1,2]",
    "true",
  ])("rejects non-object JSON root %s without crashing", (json) => {
    for (const tool of [diagnoseTree, validateTree, fixTree]) {
      const out = tool(json);
      expect(out).toContain("Invalid JSON");
      expect(out).toContain("expected an object element tree");
    }
  });

  it("does not crash on a deeply nested tree", async () => {
    // Built as a string (JSON.stringify recurses and overflows first at this
    // depth) so the stress lands on JSON.parse + doctor, not the test itself.
    const depth = 10_000;
    const json = `${'{"div":['.repeat(depth)}"leaf"${"]}".repeat(depth)}`;
    // The contract is "no crash": either doctor copes or the tools return a
    // readable failure string — they must never throw (incl. stack overflow).
    for (const tool of [diagnoseTree, validateTree, fixTree]) {
      expect(typeof tool(json)).toBe("string");
    }
    // And the same input through the dispatcher stays a structured result.
    const result = await handleToolCall("domphy_validate", { element: json });
    expect(typeof result.content[0].text).toBe("string");
    // A doctor crash must not look like a successful validate report.
    if (
      result.content[0].text.startsWith("validate failed:") ||
      result.content[0].text.startsWith("Invalid JSON:") ||
      result.content[0].text.startsWith("Error:")
    ) {
      expect(result.isError).toBe(true);
    }
  });

  it("handles moderately deep trees normally", () => {
    let tree: unknown = { div: "leaf" };
    for (let index = 0; index < 200; index++) tree = { div: [tree] };
    expect(diagnoseTree(JSON.stringify(tree))).toContain("No issues found");
  });
});

describe("fetch policy (timeout, retry, cache TTL)", () => {
  it("retries once and succeeds when the first attempt fails", async () => {
    vi.resetModules();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        if (calls === 1) throw new Error("connection reset");
        return { ok: true, json: async () => manifest };
      }),
    );
    const fresh = await import("../src/tools");
    expect(await fresh.listPatches()).toContain("button");
    expect(calls).toBe(2);
  });

  it("gives up after one retry with an actionable error", async () => {
    vi.resetModules();
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        throw new Error("connection reset");
      }),
    );
    const fresh = await import("../src/tools");
    await expect(fresh.listPatches()).rejects.toThrow(
      /connection reset \(https:\/\/domphy\.com\/manifest\.json; 2 attempts/,
    );
    expect(calls).toBe(2);
  });

  it("turns a hanging fetch into a timeout error, not a hang", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("The operation was aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      ),
    );
    const fresh = await import("../src/tools");
    const pending = fresh.listPatches();
    const assertion = expect(pending).rejects.toThrow(/timed out after 10s/);
    // Two attempts (initial + retry), each with its own 10s timeout.
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });

  it("refetches the manifest after the cache TTL expires", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    let payload: unknown = manifest;
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return { ok: true, json: async () => payload };
      }),
    );
    const fresh = await import("../src/tools");

    expect(await fresh.listPatches()).toContain("button");
    expect(calls).toBe(1);

    // Within the TTL the cache is served — no new fetch.
    vi.setSystemTime(Date.now() + 60_000);
    expect(await fresh.listPatches()).toContain("button");
    expect(calls).toBe(1);

    // Past the TTL the manifest is refetched.
    payload = {
      ...manifest,
      patches: [{ ...manifest.patches[0], name: "card" }],
    };
    vi.setSystemTime(Date.now() + 6 * 60_000);
    const out = await fresh.listPatches();
    expect(calls).toBe(2);
    expect(out).toContain("card");
  });

  it("a fetch failure surfaces as a structured tool error via handleToolCall", async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const freshHandler = await import("../src/handler");
    const result = await freshHandler.handleToolCall("domphy_rules", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("network down");
    expect(result.content[0].text).toContain("DOMPHY_ORIGIN");
  });
});
