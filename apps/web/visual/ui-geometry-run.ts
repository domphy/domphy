/**
 * Run identity for the geometry audit, shared by ui-geometry.config.ts and
 * ui-geometry.spec.ts so both write under the same per-run folder. Derived from
 * the environment only, so every Playwright worker computes the same value.
 */

/** Patches to mount and assert (GEOMETRY_PATCHES=button,tabs); empty = all. */
export const PATCHES =
  process.env.GEOMETRY_PATCHES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/**
 * Every path a run writes hangs off this id, so several runs can work at once
 * without clobbering each other. The default is the patch filter itself, which
 * is unique per agent because each agent audits its own patch group.
 */
export const runId =
  process.env.GEOMETRY_RUN ??
  (PATCHES.length
    ? PATCHES.join("-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .slice(0, 60)
    : "all");
