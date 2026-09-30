import { defineConfig } from "@playwright/test";
import { runId } from "./ui-geometry-run.ts";

/**
 * Real-browser GEOMETRY audit of every @domphy/ui patch (label centring, line
 * box fit, overflow, icon alignment, sibling alignment) across root/host font
 * sizes 12–24 px, light + dark, five densities. Self-contained: the spec
 * bundles the page with esbuild (@domphy/* aliased to source) and loads it
 * into Chromium via setContent — no dev server to start or kill.
 *
 * Filterable and safe to run concurrently: GEOMETRY_PATCHES picks the patches to
 * mount, and every path written hangs off that filter (apps/web/.ui-qa/geometry/<run>/).
 *
 *   pnpm --filter domphy-web visual:ui-geometry
 *   GEOMETRY_PATCHES=button,toggleGroup,inputCheckbox pnpm --filter domphy-web visual:ui-geometry
 *   GEOMETRY_SHOTS=0 …   skip the contact sheets
 */
export default defineConfig({
  testDir: ".",
  testMatch: "ui-geometry.spec.ts",
  // Per-run, so seven agents auditing seven patch groups never share a file.
  outputDir: `../.ui-qa/geometry/${runId}/pw`,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 900_000,
  use: {
    viewport: { width: 1800, height: 1000 },
    screenshot: "off",
    reducedMotion: "reduce",
  },
});
