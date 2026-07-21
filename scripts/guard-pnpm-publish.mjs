/**
 * Fail publish unless the invoking agent is pnpm.
 *
 * `npm publish` does not rewrite `workspace:` protocol deps, which twice
 * leaked `workspace:^` into published tarballs (ui 0.18.22, press 0.20.11).
 * pnpm rewrites them to real versions before packing.
 *
 * Wire this as the first step of each package's `prepublishOnly`.
 */
const userAgent = process.env.npm_config_user_agent ?? ""

if (!userAgent.includes("pnpm")) {
	console.error(
		[
			"error: publish must be run via pnpm (e.g. `pnpm publish`).",
			"",
			`  npm_config_user_agent=${userAgent || "(empty)"}`,
			"",
			"npm publish does not rewrite workspace: protocol deps and will",
			"leak them into the published tarball. Use `pnpm publish` instead.",
		].join("\n"),
	)
	process.exit(1)
}
