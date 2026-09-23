# Known debt ledger

Every line here has a matching `// ledger:<id>` comment at its code site, and
every `// ledger:<id>` comment in the repo has a matching line here —
enforced two-way by `scripts/known-debt.test.mjs` (`node --test
scripts/known-debt.test.mjs`, wired into `pnpm ci` and `.github/workflows/ci.yml`).
A line without a marker, or a marker without a line, fails that test.

Written after the 2026-09-23 audit-fix wave (~40 parallel agents across every
package), swept for gate prep on 2026-09-24: every item that was checked
named a gap already closed by a later pass in the same tree, accepted as
correct behavior (e.g. `@tanstack/table-core` v8 pin, embedding the WebGL
plot area as a raster `<image>` on SVG export, boxplot/heatmap/pie brush
coverage — the last two are parity with upstream ECharts, which implements no
`brushSelector()` for those series types either), or reassigned to a
dedicated agent. Nothing is currently open.
