import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(PACKAGE_DIR, "../..");
const DIST_CLI = join(PACKAGE_DIR, "dist", "index.js");

// The full end-to-end run (scaffold → npm install → vite dev server → headless
// Chromium) hits the npm registry and takes minutes, so it only runs when
// explicitly enabled:
//   CREATE_DOMPHY_E2E=1 pnpm --filter create-domphy test
// With the flag off the suite is skipped at runtime, but this file is still
// compiled on every `npm test`, so the e2e path cannot silently stop compiling.
const RUN_E2E = process.env.CREATE_DOMPHY_E2E === "1";

// npm install + vite cold start + browser launch on a slow connection.
const E2E_TIMEOUT_MS = 10 * 60 * 1000;

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

// The published artifact is dist/index.js; rebuild it when any source file is
// newer so the e2e test exercises the current templates, not a stale build.
// Use build:bundle (tsup only) — `npm run build` would regenerate
// src/versions.generated.ts as a test side-effect.
function buildCliIfStale(): void {
  const sources = [
    "index.ts",
    "templates.ts",
    "versions.generated.ts",
    "write.ts",
  ].map((file) => join(PACKAGE_DIR, "src", file));
  const distFresh =
    existsSync(DIST_CLI) &&
    sources.every(
      (source) =>
        existsSync(source) &&
        statSync(source).mtimeMs <= statSync(DIST_CLI).mtimeMs,
    );
  if (distFresh) return;
  const build = spawnSync(NPM_COMMAND, ["run", "build:bundle"], {
    cwd: PACKAGE_DIR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    throw new Error("create-domphy bundle failed — cannot run e2e test");
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolvePort(port));
      } else {
        reject(new Error("could not allocate a free port"));
      }
    });
  });
}

async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Server not up yet — keep polling.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
  }
  return false;
}

// The CLI pins each @domphy/* dependency to the version in this repo, which
// can be ahead of the npm registry (a maintainer bumps a version before
// publishing). `npm install` would then fail with ETARGET, making the test
// red for a reason unrelated to what it guards. Clamp every @domphy/* range
// to the latest published release — the e2e run exists to prove the rendered
// page is themed, not to assert publish timing.
function clampToPublishedVersions(projectDir: string): void {
  const packageJsonPath = join(projectDir, "package.json");
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies: Record<string, string>;
  };
  for (const name of Object.keys(parsed.dependencies)) {
    if (!name.startsWith("@domphy/")) continue;
    const view = spawnSync(NPM_COMMAND, ["view", name, "version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    const published = view.stdout.trim();
    if (view.status !== 0 || published.length === 0) {
      throw new Error(`npm view ${name} version failed: ${view.stderr}`);
    }
    parsed.dependencies[name] = `^${published}`;
  }
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(parsed, null, 2)}\n`,
    "utf8",
  );
}

// Terminate the dev server and wait for it to actually exit before cleanup.
// On Windows, kill() maps to TerminateProcess, which does not cascade — vite's
// esbuild grandchild stays alive, and its working directory keeps the temp
// dir locked (EBUSY on rmdir). taskkill /T /F takes down the whole tree.
async function stopServer(server: ChildProcess): Promise<void> {
  const exited = new Promise<void>((resolveExit) => {
    if (server.exitCode !== null || server.signalCode !== null) {
      resolveExit();
    } else {
      server.once("exit", () => resolveExit());
    }
  });
  if (process.platform === "win32" && server.pid !== undefined) {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    server.kill("SIGTERM");
  }
  await Promise.race([
    exited,
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 10_000)),
  ]);
}

describe.skipIf(!RUN_E2E)(
  "create-domphy e2e (requires CREATE_DOMPHY_E2E=1)",
  () => {
    it(
      "scaffolds an app whose first dev-server render is themed, not unstyled",
      async () => {
        // Regression guard for the P0 where the starter called themeApply()
        // without applySystemTheme(): the CSS was injected but no [data-theme]
        // scope was active, every var(--…) token resolved to nothing, and the
        // demo rendered with invisible/transparent buttons. Unit tests can check
        // that main.ts contains the call; only this e2e run proves the rendered
        // page is actually styled.
        buildCliIfStale();

        const projectDir = mkdtempSync(join(tmpdir(), "create-domphy-e2e-"));
        let server: ChildProcess | undefined;
        let browser: { close(): Promise<void> } | undefined;

        try {
          // 1. Run the real CLI into the temp directory.
          const scaffold = spawnSync(process.execPath, [DIST_CLI, projectDir], {
            encoding: "utf8",
          });
          expect(scaffold.status).toBe(0);
          expect(existsSync(join(projectDir, "src", "main.ts"))).toBe(true);
          clampToPublishedVersions(projectDir);

          // 2. Install the scaffolded dependencies from the npm registry.
          const install = spawnSync(
            NPM_COMMAND,
            ["install", "--no-audit", "--no-fund"],
            {
              cwd: projectDir,
              stdio: "inherit",
              shell: process.platform === "win32",
              timeout: E2E_TIMEOUT_MS,
            },
          );
          expect(install.status).toBe(0);

          // 3. Start the dev server. Spawn vite through node directly (rather
          // than via the `npm run dev` wrapper) so kill() terminates the real
          // server process on Windows instead of orphaning a grandchild.
          // --host 127.0.0.1 pins IPv4: with vite's default "localhost" bind
          // the server may listen only on ::1, which the URL below can't reach.
          const port = await findFreePort();
          const url = `http://127.0.0.1:${port}/`;
          server = spawn(
            process.execPath,
            [
              join(projectDir, "node_modules", "vite", "bin", "vite.js"),
              "--host",
              "127.0.0.1",
              "--port",
              String(port),
              "--strictPort",
            ],
            { cwd: projectDir, stdio: ["ignore", "ignore", "pipe"] },
          );
          let serverLog = "";
          server.stderr?.on("data", (chunk) => {
            serverLog += String(chunk);
          });
          const serverUp = await waitForUrl(url, 120_000);
          expect(serverUp, `vite dev server did not start:\n${serverLog}`).toBe(
            true,
          );

          // 4. Load the page in headless Chromium. playwright is a devDependency
          // of @domphy/blocks, not of this package, so it is loaded through
          // createRequire (same pattern as .ui-qa/shoot-all.mjs).
          const requireFromBlocks = createRequire(
            join(REPO_ROOT, "packages", "blocks", "package.json"),
          );
          const { chromium } = requireFromBlocks("playwright");
          browser = await chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto(url, { waitUntil: "domcontentloaded" });
          await page.waitForSelector("#app button", { timeout: 30_000 });

          // 5. Assert the theme is active and styles actually resolve.
          const themeName = await page.evaluate(() =>
            document.documentElement.getAttribute("data-theme"),
          );
          expect(["light", "dark"]).toContain(themeName);

          const buttonBackground = await page.evaluate(() => {
            const button = document.querySelector("#app button");
            return button ? getComputedStyle(button).backgroundColor : null;
          });
          expect(buttonBackground).not.toBeNull();
          // An unstyled button computes to the initial (transparent) background.
          expect(buttonBackground).not.toBe("rgba(0, 0, 0, 0)");
          expect(buttonBackground).not.toBe("transparent");

          const bodyFontFamily = await page.evaluate(
            () => getComputedStyle(document.body).fontFamily,
          );
          expect(bodyFontFamily).not.toBe("");
          expect(bodyFontFamily.toLowerCase()).not.toContain("times");
        } finally {
          if (browser) await browser.close();
          if (server) await stopServer(server);
          try {
            rmSync(projectDir, {
              recursive: true,
              force: true,
              maxRetries: 10,
              retryDelay: 1000,
            });
          } catch (error) {
            // Leftover temp dirs are reclaimed by the OS; a cleanup hiccup
            // must not mask the real test result above.
            console.warn(
              `e2e cleanup: could not remove ${projectDir}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      },
      E2E_TIMEOUT_MS,
    );
  },
);
