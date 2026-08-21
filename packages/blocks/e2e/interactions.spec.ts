import { execFile } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const checksDir = join(packageRoot, "scripts", "interaction-checks");
const checkFiles = readdirSync(checksDir)
  .filter((name) => name.endsWith(".ts"))
  .sort();

test.describe.configure({ timeout: 120_000 });

for (const file of checkFiles) {
  test(`interact ${file.replace(/\.ts$/, "")}`, async ({ baseURL }) => {
    const origin = baseURL ?? "http://127.0.0.1:5611";
    try {
      const { stdout, stderr } = await execFileAsync(
        "pnpm",
        ["exec", "tsx", join("scripts", "interaction-checks", file)],
        {
          cwd: packageRoot,
          env: { ...process.env, BLOCKS_E2E_BASE_URL: origin },
          timeout: 90_000,
          shell: true,
          encoding: "utf8",
          maxBuffer: 2_000_000,
        },
      );
      const output = `${stdout}\n${stderr}`;
      const fails = output
        .split("\n")
        .filter((line) => line.startsWith("FAIL "));
      expect(fails, output).toEqual([]);
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message: string;
      };
      throw new Error(
        `${execError.stdout ?? ""}\n${execError.stderr ?? ""}\n${execError.message}`,
      );
    }
  });
}
