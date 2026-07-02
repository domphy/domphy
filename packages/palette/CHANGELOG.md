# @domphy/palette

## 0.19.0

- **Generator**: `generateRamp(hexs, stepsCount)` opened as public API — builds a
  WCAG-optimized sequential ramp from one or more anchor colors via warped Oklab
  interpolation (`P=0.605`, `Q=0.685`), landing the WCAG 4.5:1 contrast span close to
  the analytically-ideal span (`K_ideal = ceil(0.501 * (N-1))`). Ported from the
  studio reference implementation with full disclosure of the warp constants.

## 0.11.0

Initial release.

- Ports the [chromametry](https://github.com/) color-science project (MIT) into Domphy.
- **Metrics**: `Swatch`, `Ramp`, and `Palette` compute five CIELAB quality metrics —
  `contrastEfficiency`, `lightnessLinearity`, `chromaSmoothness`, `hueStability`,
  `spacingUniformity` — plus a geometric-mean `score`, and WCAG/APCA contrast-span analysis.
- Exports the underlying color-math utilities (CIELAB / Oklab / CIEDE2000 / monotone
  interpolation).
- Zero runtime dependencies; framework-agnostic (no `@domphy/core` dependency).
