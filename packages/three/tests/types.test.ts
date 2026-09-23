import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");

describe("scene description types", () => {
  it("contextually types every scene callback (react-three-fiber's ThreeElements/EventHandlers contract: zero annotations in scene code, wrong member access is a compile error)", () => {
    // tests/fixtures/contextual-typing.ts marks every line that MUST fail to
    // compile with @ts-expect-error, so tsc reports an error both when a
    // typed callback breaks AND when the types degrade to `any` (the
    // expect-error then goes unused -> TS2578).
    let output = "";
    let failed = false;
    try {
      execFileSync(
        process.execPath,
        [tsc, "-p", join(here, "fixtures", "tsconfig.json"), "--noEmit"],
        { encoding: "utf8", stdio: "pipe" },
      );
    } catch (error) {
      failed = true;
      const result = error as { stdout?: string; stderr?: string };
      output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    }
    expect(failed ? output : "").toBe("");
  }, 120_000);
});
