# Domphy stable-release readiness

Enterprise gate for the first **official stable** public cut of every publishable package under `packages/*` (+ `create-domphy`).  
**Release blockers = P0 only.** P1/P2 stay tracked after stable.

## Policy

| Topic | Decision |
| --- | --- |
| Semver | Packages ship **production-ready 0.x** today. Coordinated **1.0.0** is the stable *major* label; until that publish, **current `package.json` versions on `main` are the stable track** (npm `latest` after publish). |
| Gate | P0 gaps closed · `pnpm run ci` green · `node scripts/verify-publish.mjs --all` green · this matrix current. |
| Peers | Workspace `workspace:^` peers rewrite to concrete `^x.y.z` on `pnpm pack` / publish (verified). |

## Peer matrix

| Package | Version | React / ecosystem peers | P0 | P1 | P2 | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `@domphy/core` | 0.19.3 | React / Solid (runtime model) | none | SSR edge cases vs React 19 streaming | Docs deep-dives | SSR + hydration + behavior() shipped; tests cover reconcile/lifecycle. |
| `@domphy/theme` | 0.20.1 | CSS vars / design tokens (no React peer) | none | Dark-mode OS sync docs | Token export helpers | solid-role ramps distinct (warning≠primary, error≠danger). |
| `@domphy/ui` | 0.20.8 | Radix UI / shadcn/ui | none | Broader a11y suite (axe on every patch) | Storybook-class docs | Dialog focus trap/restore + scroll-lock tests; doctor conformance. |
| `@domphy/floating` | 0.18.1 | Floating UI | none | — | Size middleware parity | Zero-dep vendored positioning. |
| `@domphy/palette` | 0.19.0 | chroma.js / culori (design tools) | none | — | CLI export | Ramp metrics + generateRamp. |
| `@domphy/doctor` | 0.18.15 | eslint-plugin-jsx-a11y / Stylelint | none | Optional htmlhint/stylelint peers docs | Custom rule marketplace | diagnose/validate/fix API + tests. |
| `@domphy/query` | 0.18.1 | TanStack Query | none | Devtools adapter; createQueries helper | Persist plugin | Core + `/domphy` adapter; `throwOnError` throws on reactive reads. |
| `@domphy/table` | 0.18.1 | TanStack Table | none | Column virtualization recipes | — | Core + `/domphy` adapter. |
| `@domphy/form` | 0.18.1 | TanStack Form / RHF | none | Standard schema adapters docs | — | Core + `/domphy` adapter; invalid submit + `setErrorMap` tested. |
| `@domphy/virtual` | 0.18.1 | TanStack Virtual | none | Grid virtualizer / window helper examples | — | Core + `/domphy` adapter. |
| `@domphy/router` | 0.18.1 | TanStack Router | none | File-route codegen; SSR integration tests; Link helper | Devtools | SSR client/server exports; match/loader core tested. |
| `@domphy/dnd` | 0.18.3 | FormKit DnD (list model; not dnd-kit canvas) | none | Keyboard sortable a11y suite; drag sim tests | — | Thin FormKit adapter for sortable/multi-list. |
| `@domphy/app` | 0.18.1 | Next.js App Router | none | Edge middleware cookbook; page SSR Set-Cookie/headers; revalidateTag | Deploy adapters | Loaders, lazy, i18n, cookies(read), SSR tests. |
| `@domphy/blocks` | 0.1.2 | shadcn blocks + Magic UI | none | Full visual re-baseline in CI | More device demo assets | 173 demos; SOURCES.md clean-room; visual QA harness. |
| `@domphy/chart` | 0.2.3 | ECharts / Recharts | none | SSR canvas snapshot tests; percent stack | More series demos | Canvas engine + theme; unsupported custom/toolbox/brush warn. |
| `@domphy/three` | 0.2.1 | @react-three/fiber | none | Asset loader error-boundary recipes; pointer container offset | — | R3F-class reconciler port + doctor. |
| `@domphy/markdown` | 0.19.1 | react-markdown / MDX | none | MDX component map docs; CDN global entry | — | remark pipeline → Domphy trees. |
| `@domphy/mermaid` | 0.18.1 | mermaid + React wrappers | none | Client hydrate stress tests | — | Build-time SVG via optional mermaid-cli; client patch. |
| `@domphy/press` | 0.21.4 | VitePress | none | Search backend pluggability | Theme marketplace | CLI build/dev/preview. |
| `@domphy/i18n` | 0.19.2 | react-i18next | none | ICU messageformat | — | Reactive `t(listener,key)` + singleton tests. |
| `@domphy/mcp` | 0.19.2 | (no React peer; MCP SDK) | none | Offline/local manifest fallback; more tools | — | Agent tools over doctor/patches; SERVER_VERSION synced. |
| `create-domphy` | 0.18.3 | `create-vite` / `create-next-app` | none | More templates | — | Version pin regression tests. |

### P0 closed this cut (historical + current)

| ID | Package | Gap | Resolution |
| --- | --- | --- | --- |
| P0-PUBLISH | all | packed tarball must not contain `workspace:` | `verify-publish.mjs --all` OK; peers rewrite to `^x.y.z` |
| P0-CI | monorepo | release gate must be runnable | `pnpm run ci` = check + build + test + `stable-readiness-check` |
| P0-CHANGELOG | all publishable | missing per-package CHANGELOG and/or tarball files | CHANGELOG.md present; listed in package `files` |
| P0-META | i18n | corrupted package description encoding | description fixed to ASCII-safe text |
| P0-VISUAL | ui / blocks | solid role collisions + empty demos | theme anchors + factory defaults (prior commits) |
| P0-QUERY-THROW | query | `throwOnError` documented but adapter never threw | reactive field reads throw when errored; tests |
| P0-FORM-SUBMIT | form | docs claimed throw→`state.errors`; invalid path untested | docs + tests: `setErrorMap`, `onSubmitInvalid`, rethrow contract |
| P0-CHART-SURFACE | chart | typed/docs `custom`/`toolbox`/`brush` silent no-op | console warn + README honesty |
| P0-MERMAID-CLI | mermaid | hard dependency on mermaid-cli/Chromium | `optionalDependencies` + clearer install error |
| P0-MCP-VERSION | mcp | SERVER_VERSION lagged package.json | synced to 0.19.2 |
| P0-DIALOG-FOCUS | ui | focus trap/restore untested vs Radix contract | overlay tests for restore + Tab trap |

## Stable cut — remaining publish steps

Credentials are local to the maintainer. After this matrix is green on `main`:

```bash
# 1. Confirm gate
pnpm run ci
node scripts/verify-publish.mjs --all

# 2. Optional coordinated 1.0.0 (product decision)
#    bump each packages/*/package.json version + CHANGELOG heading
#    update create-domphy versions via its generate:versions script
#    commit + tag v1.0.0

# 3. Publish (order respects peers: core → palette/theme/floating → ui → rest)
pnpm publish:core
pnpm publish:palette
pnpm publish:theme
pnpm publish:floating
pnpm publish:ui
# … remaining publish:* scripts from root package.json
pnpm publish:create-domphy
```

## Verification artifacts

Generated under implementer scratch during readiness work:

- `matrix-coverage.txt` — every publishable package row present
- `react-peer-audit.md` — full-matrix peer audit
- `p0-tests.log` — targeted tests for closed P0s
- `ci.log` — `pnpm run ci` output
- `verify-publish.log` — packed tarball workspace-protocol scan
- `stable-cut.txt` — version set extract

## Non-goals (not release-blocking)

- Full API clone of React peers  
- Infinite P1/P2 polish  
- Re-running full 173-block visual matrix on every release (use `apps/web/visual` when UI changes)  
