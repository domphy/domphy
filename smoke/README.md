# smoke/ — tarball-install smoke test

Verifies that the publishable packages work when installed the way a real
consumer installs them: from packed tarballs, **not** workspace links.
Inside the pnpm workspace every `@domphy/*` dependency resolves via
`link:`, which hides missing-dependency and `exports`-map bugs that break
real consumers. This suite packs real tarballs and installs them with
**npm** (not pnpm — consumers use npm, and npm's hoisting differs from
pnpm's strict layout).

## What it does

1. Discovers every publishable package — `packages/*/package.json` without
   `"private": true` (currently 20) — and packs each into
   `smoke/.tarballs/` (gitignored), renaming the tarball to a stable
   version-free name (e.g. `domphy-core.tgz`) so fixtures can reference it
   with fixed `file:` paths. Packing uses **`pnpm pack`**, not `npm pack`:
   the repo declares inter-package dependencies as `workspace:`, and the
   real publish flow (`pnpm publish`) rewrites those to concrete versions
   at pack time. `npm pack` would ship the raw `workspace:` protocol,
   which no consumer ever receives — the pnpm-packed tarball is the
   faithful stand-in for the published artifact.
2. Runs each fixture consumer under `smoke/fixtures/`:
   - **`vite-app/`** — a minimal Vite + TypeScript app. Installs
     `@domphy/core`, `@domphy/theme`, and `@domphy/ui` from the tarballs,
     renders a themed button with a `toState` counter via
     `new ElementNode(App).render(el)`, then `tsc --noEmit && vite build`
     must succeed (exercises the packed runtime **and** the packed type
     declarations).
   - **`ssr-app/`** — a plain Node ESM script. Installs `@domphy/core` and
     `@domphy/press` (plus press's `@domphy/*` peer closure — app/theme/ui —
     the local versions are ahead of the npm registry, so peers must come
     from tarballs too) from the tarballs, SSR-renders a small tree (plus a
     Markdown-parsed tree) to an HTML string via `generateHTML()`, and
     asserts expected substrings. Runs with plain `node`.
   Each fixture gets a **fresh** install: `node_modules/`,
   `package-lock.json`, and build output are wiped first, so no lockfile or
   cache is ever reused.
3. Reports per-fixture PASS/FAIL (with the real error output on failure)
   and exits non-zero if anything failed.

## Running

```sh
pnpm -r build   # packing ships the prebuilt dist/ — build first
pnpm smoke      # = node smoke/run-smoke.mjs
```

CI runs this as the `smoke` job in `.github/workflows/ci.yml`.

## Artifacts

Everything generated is gitignored: `smoke/.tarballs/`, and each fixture's
`node_modules/`, `package-lock.json`, and `dist/`. Only the runner, this
README, and the fixture sources (package.json + source files) are tracked.

## Adding a fixture

Create `smoke/fixtures/<name>/` with a `package.json` whose dependencies
use `file:../../.tarballs/<canonical-name>.tgz`, then add an entry to the
`fixtures` array in `run-smoke.mjs` with the verify command(s) to run after
install.
