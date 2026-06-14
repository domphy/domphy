# @domphy/palette

## 0.11.0

Initial release.

- Ports the [chromametry](https://github.com/) color-science project (MIT) into Domphy.
- **Metrics**: `Swatch`, `Ramp`, and `Palette` compute five CIELAB quality metrics —
  `contrastEfficiency`, `lightnessLinearity`, `chromaSmoothness`, `hueStability`,
  `spacingUniformity` — plus a geometric-mean `score`, and WCAG/APCA contrast-span analysis.
- **Generator**: `generateRamp(hexs, stepsCount)` produces perceptually-uniform color ramps
  from one or more anchor colors (pure-JS Oklab interpolation; the upstream WASM backend is
  not bundled).
- **Optimizer**: `optimize()` tunes the generator's warp parameters via a deterministic
  grid + local search.
- Exports the underlying color-math utilities (CIELAB / Oklab / CIEDE2000 / monotone
  interpolation).
- Zero runtime dependencies; framework-agnostic (no `@domphy/core` dependency).
