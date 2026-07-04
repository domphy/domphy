// Shared "frosted glass" caption panel for ambient/animated background
// blocks (aurora glow, gradient blobs, particle vortex, wavy canvas, etc.)
// whose default demo text otherwise sits directly on a colorful, moving
// backdrop. The real per-pixel WCAG contrast scan (scripts/contrast-scan-
// backgrounds.ts) caught several of these dropping below the 4.5:1 threshold
// at some point in their animation cycle — the theme's shift-based color
// contract only guarantees contrast against the flat `dataTone` surface, not
// against a decorative layer compositing on top of it via blend modes/blur.
// A translucent panel dominated by the surface's own base tone (94% opacity)
// keeps text legible regardless of what's moving behind it, without
// affecting a caller-supplied `children` override (which bypasses this and
// is the caller's own responsibility). Bumped twice against the real scan,
// not derived analytically: 82% still measured real failures on vortex's
// particles/wavyBackground's stroked waves; 90% still left noiseTexture at
// 4.45:1 (need 4.5:1).
import type { Listener, StyleObject } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

export function demoContentScrimStyle(): StyleObject {
  return {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    gap: themeSpacing(2),
    backgroundColor: (listener: Listener) => `color-mix(in srgb, ${themeColor(listener, "inherit")} 94%, transparent)`,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: themeSpacing(4),
    padding: themeSpacing(6),
  } as StyleObject;
}
