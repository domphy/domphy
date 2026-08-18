/**
 * Fail publish unless the invoking agent is pnpm.
 *
 * `npm publish` does not rewrite `workspace:` protocol deps, which twice
 * leaked `workspace:^` into published tarballs (ui 0.18.22, press 0.20.11).
 * pnpm rewrites them to real versions before packing.
 *
 * Wire this as the first step of each package's `prepublishOnly`.
 *
 * Detection uses `npm_execpath` (the real CLI that launched the lifecycle
 * script). `npm_config_user_agent` is spoofable
 * (`npm_config_user_agent=pnpm npm publish`) and is not trusted.
 */

/**
 * True when `npm_execpath` is a pnpm binary or lives under a `pnpm` path
 * segment (`pnpm.cjs`, `pnpm.cmd`, `corepack/dist/pnpm.js`, …).
 * @param {string} execPath
 */
function isPnpmExecPath(execPath) {
  const normalized = execPath.replace(/\\/g, "/");
  return normalized.split("/").some((segment) => /^pnpm(\.|$)/i.test(segment));
}

const execPath = process.env.npm_execpath ?? "";
const command = process.env.npm_command ?? "";
const userAgent = process.env.npm_config_user_agent ?? "";

if (!isPnpmExecPath(execPath)) {
  console.error(
    [
      "error: publish must be run via pnpm (e.g. `pnpm publish`).",
      "",
      `  npm_execpath=${execPath || "(empty)"}`,
      `  npm_command=${command || "(empty)"}`,
      `  npm_config_user_agent=${userAgent || "(empty)"} (not trusted)`,
      "",
      "npm publish does not rewrite workspace: protocol deps and will",
      "leak them into the published tarball. Use `pnpm publish` instead.",
    ].join("\n"),
  );
  process.exit(1);
}
