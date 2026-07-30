# Domphy vs React — comprehensive evaluation & path to surpass

**Status:** analysis only (no feature work).  
**Scope date:** 2026-07-30 · monorepo `main`  
**Primary sources:** this repo (`AGENTS.md`, `STABLE-READINESS.md`, `README.md`, `apps/web/docs/guide/*`, `packages/*/README.md`, `DESIGN.md`, `paper/`, `bench/`).  
**Peer claims (React / Next / Radix / TanStack):** grounded in STABLE-READINESS peer column + package READMEs; upstream primary docs listed in §Sources — **not fully re-crawled this session** where marked *repo-only*.

**How to read this doc**

| Label | Meaning |
| --- | --- |
| **Fact (repo)** | Claim verified from a path/symbol in this monorepo |
| **Fact (docs)** | Claim from in-repo docs; may lag code — prefer path if both exist |
| **Opinion** | Judgment / strategy; not a statement that “the product already does X” |

Release-gate P0s (publish/CI/matrix) live in `STABLE-READINESS.md`. Gap severities in §4 are **surpass-strategy** severities and are **not** the same list unless noted.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Seven-axis evaluation](#2-seven-axis-evaluation)
   - [a. Programming model](#a-programming-model)
   - [b. UI / component surface & a11y](#b-ui--component-surface--a11y)
   - [c. Data / routing / form ecosystem](#c-data--routing--form-ecosystem)
   - [d. App / framework layer](#d-app--framework-layer)
   - [e. AI-agent / plain-object / doctor toolchain](#e-ai-agent--plain-object--doctor-toolchain)
   - [f. Design system (theme / palette)](#f-design-system-theme--palette)
   - [g. Bundle / build / DX friction](#g-bundle--build--dx-friction)
3. [Package × peer matrix (parity / lead / lag)](#3-package--peer-matrix)
4. [How to surpass React — prioritized playbook](#4-how-to-surpass-react--prioritized-playbook)
5. [Surpass gaps by severity](#5-surpass-gaps-by-severity)
6. [Sources](#6-sources)

---

## 1. Executive summary

**Fact (repo):** Domphy is a **patch-based, framework-agnostic UI runtime**: plain objects keyed by HTML tag, behavior via `$` patches, listener-based reactivity (`toState`), SSR + hydration, no JSX / no required build step for the core model (`README.md`, `AGENTS.md`, `packages/core/README.md`).

**Fact (repo):** Domphy ships a **full stack** around that model: theme + 96 UI patches + 173 blocks + query/table/router/form/virtual + app (Next-style) + press docs + doctor + MCP + chart/three/editor (`README.md` package map; `STABLE-READINESS.md` peer matrix, 23 publishable packages).

**Opinion — where Domphy already wins vs React’s default path**

1. **AI-native generation + self-correction** (plain objects + `@domphy/doctor` + `AGENTS.md` / `llms*.txt` / `@domphy/mcp`) — React has no first-party tree-level doctor for “is this idiomatic UI?”.
2. **Zero-compiler UI syntax** for plugins / webviews / script-tag embeds (`why-domphy.md`).
3. **Patches on native elements** (no wrapper-component trees for button+tooltip) — cleaner DOM/CSS/a11y surface.
4. **Built-in, math-backed design system** (`themeColor` / spacing / density; `DESIGN.md` / `paper/`) instead of “pick Tailwind or MUI yourself”.

**Opinion — where React still wins (honest)**

1. **Ecosystem gravity** — hiring, Stack Overflow, third-party React-only libraries, Design System vendor SDKs.
2. **Battle-hardened edge cases** at internet scale (React 19 streaming nuances, concurrent features, ecosystem tooling).
3. **Community a11y depth** — Radix/shadcn + years of axe CI culture; Domphy covers core overlays (tested) but not “axe on every patch” yet (`STABLE-READINESS` P1 on `@domphy/ui`).

**“Surpass React” definition used here (Opinion):** for **named jobs** (AI-built UIs, tool/plugin apps, design-system-first internal products), Domphy should be the **strictly better default** on correctness-per-token, time-to-correct-UI, and design-system integrity — not a full API clone of React 19 + every npm package.

---

## 2. Seven-axis evaluation

### a. Programming model

| Topic | Domphy | React (peer model) | Verdict |
| --- | --- | --- | --- |
| Element description | Plain object: first key = tag (`AGENTS.md`) | JSX → React elements | **Lead** (no syntax transform) |
| Composition | Patches via `$`; native element wins over defaults | Components + composition | **Lead** for DOM honesty; **Lag** for mental-model familiarity |
| Reactivity | `toState` / `RecordState` / `computed` / `effect` / `batch` / `untrack` / `peek` / `flushSync` (`AGENTS.md`, `packages/core`) | `useState` / `useMemo` / `useEffect` + concurrent model | **Parity** on basic app state; **Lag** on concurrent/transition ecosystem story |
| List identity | `_key` for reconcile (`AGENTS.md`) | `key` prop | **Parity** |
| Lifecycle | `_onInit` / `_onMount` / `_onBeforeRemove`… + `behavior()` for reuse-safe imperative state (`AGENTS.md` “Reused-node lifecycle”) | mount/unmount + refs + effects | **Lead** on explicit reuse contract after hard bugs fixed; **Lag** on community docs density |
| SSR / hydration | Built into core; router/app layers add handlers (`STABLE-READINESS` core/router/app notes) | React DOM SSR + frameworks | **Parity** baseline; **Lag** vs React 19 streaming edge cases (matrix P1) |

**Fact (repo):** String children are always text (escaped); HTML opt-in is `rawHtml()` (`AGENTS.md`).  
**Fact (repo):** Controlled inputs are `value: (l) => s.get(l)` + `onInput` (`AGENTS.md`).  
**Fact (docs):** React mapping documented in `apps/web/docs/guide/from-react.md`.  
**Opinion:** The hardest Domphy skill is **reused-node lifecycle** (closures reset while DOM is reused). That is documented and partially productized via `behavior()` — surpassing React here means **making that contract un-missable for agents and humans**, not inventing another virtual DOM.

### b. UI / component surface & a11y

| Topic | Domphy | React ecosystem peer | Verdict |
| --- | --- | --- | --- |
| Primitive library | `@domphy/ui` ~96 patches (`README.md`, `AGENTS.md`) | Radix + shadcn patterns | **Parity** breadth for tool UI; **Lag** vs Radix’s a11y exhaustiveness reputation |
| Composition style | Multi-patch on one host: `$: [button(), tooltip(...)]` | Wrapper / slot components | **Lead** (single native focusable) |
| Blocks / marketing | `@domphy/blocks` 173 factories; clean-room from shadcn/Magic UI (`packages/blocks/SOURCES.md`) | shadcn blocks + Magic UI on React | **Parity** inventory; **Lag** if visual re-baseline not continuous (matrix P1) |
| Overlays | Floating via vendored `@domphy/floating`; dialog focus trap/restore + scroll-lock tests (`STABLE-READINESS` P0-DIALOG-FOCUS closed) | Floating UI + Radix Dialog | **Parity** core contract; **Lag** on “axe every patch” |
| Motion | `motion()` / `transitionGroup()` Web Animations (`AGENTS.md`) | framer-motion / CSS | **Parity** for enter/exit needs |

**Fact (repo):** Doctor forbids inline typography (`fontSize`/`color` literals etc.) — forces theme patches (`AGENTS.md` doctor rules).  
**Opinion:** Surpass path is **a11y CI + design-system-enforced patches**, not cloning every Radix prop.

### c. Data / routing / form ecosystem

| Package | Peer (STABLE-READINESS) | Fact (repo) surface | Verdict |
| --- | --- | --- | --- |
| `@domphy/query` | TanStack Query | Framework-agnostic core + `/domphy` adapter; `throwOnError` on reactive reads (P0-QUERY-THROW closed) | **Parity** core jobs; **Lag** devtools / persist / createQueries (P1) |
| `@domphy/table` | TanStack Table | Headless table + `createDomphyTable`; CellEditing feature (v0.19.0 notes) | **Parity** headless model; **Lag** recipes (column virtualization) |
| `@domphy/form` | TanStack Form / RHF | `createForm` adapter; invalid submit / `setErrorMap` tested (P0-FORM-SUBMIT) | **Parity** for headless forms; **Lag** schema adapter docs |
| `@domphy/virtual` | TanStack Virtual | Core + Domphy adapter | **Parity** list virtualization; **Lag** grid/window examples |
| `@domphy/router` | TanStack Router | Type-safe routes; SSR `createRequestHandler` tests (P0-ROUTER-SSR) | **Parity** core router; **Lag** file-route codegen / Link helper depth |
| `@domphy/dnd` | FormKit DnD | Thin FormKit adapter (`packages/dnd/README.md`) | **Parity** list DnD; **Lag** keyboard sortable suite |

**Opinion:** The stack is intentionally **TanStack-shaped**. Surpass is not “more hooks” — it is **one-install coherence** (query+table+form+router speak Domphy reactivity without React context providers).

### d. App / framework layer

| Layer | Domphy | React peer | Verdict |
| --- | --- | --- | --- |
| App framework | `@domphy/app` — routes/layouts/loaders(SWR)/metadata/middleware/parallel+intercepting/lazy/SSR+streaming/API/i18n/cookies (`packages/app/README.md`, `AGENTS.md`) | Next.js App Router | **Parity** feature checklist; **Lag** deploy adapters, edge cookbook, revalidateTag depth (P1) |
| Docs SSG | `@domphy/press` — VitePress-baseline (`packages/press/README.md`) | VitePress / Nextra | **Parity** for docs sites |
| Scaffolder | `create-domphy` → Vite+TS + AGENTS.md | create-next-app / create-vite | **Parity** starter; **Lag** template variety |

**Fact (repo):** Routes are a **plain object tree**, not a file-system convention (`packages/app/README.md`) — no bundler plugin required for the conceptual model.  
**Opinion:** vs Next, Domphy **leads** on “framework without FS magic”; **lags** on hosting defaults (Vercel/Next coupling culture).

### e. AI-agent / plain-object / doctor toolchain

This is Domphy’s sharpest edge.

| Capability | Fact (repo) | React default path | Verdict |
| --- | --- | --- | --- |
| Syntax LLMs emit naturally | Plain objects (`README.md` “Building with AI”) | JSX (special syntax) | **Lead** |
| Agent spec | Root `AGENTS.md` + `apps/web/public/llms.txt` + `llms-full.txt` | Community prompt dumps | **Lead** |
| Static tree doctor | `@domphy/doctor` — `diagnose` / `validate` / `fix`; 18 built-in rules (`AGENTS.md`) | eslint-plugin-react / jsx-a11y (code-level, not runtime tree) | **Lead** (tree-native) |
| MCP | `@domphy/mcp` — list/get patches, packages, rules, tones, doctor, app-blocks (`packages/mcp/README.md`) | Fragmented MCP servers | **Lead** |
| Bench of agent tasks | `bench/` + `generated.json` (Domphy vs React conditions A–D) | — | **Lead** (in-repo harness exists) |

**Fact (repo):** Doctor can run reactive fns (`runReactive`) and suppress via `_doctorDisable` (`AGENTS.md`).  
**Opinion:** “Surpass React” for the AI era **is** this loop: generate → diagnose → fix → ship. React cannot match it without changing its representation model.

### f. Design system (theme / palette)

| Topic | Fact (repo) | React default | Verdict |
| --- | --- | --- | --- |
| Tokens | `themeColor` / `themeSpacing` / `themeSize` / `themeDensity` / `generateTheme` (`packages/theme`, `AGENTS.md`) | Ad-hoc CSS vars / Tailwind / MUI | **Lead** (first-party, context-aware) |
| Color science | `@domphy/palette` Ramp/Palette/Swatch; 5 CIELAB metrics; `generateRamp` (`packages/palette`, `DESIGN.md`) | culori/chroma in design tools only | **Lead** for productized ramp quality |
| Formal model | `paper/` LaTeX sections on spacing/density/height geometry | Blog posts / tokens JSON | **Lead** (academic-grade in-repo) |
| Enforcement | Doctor: `raw-theme-value`, `low-contrast`, `middle-surface-anchor`, … | Optional lint plugins | **Lead** |

**Opinion:** React apps **can** look as good — after assembling 3–5 libraries. Domphy **defaults** into a coherent system. That is a product lead, not a runtime lead.

### g. Bundle / build / DX friction

| Topic | Fact (docs/repo) | React | Verdict |
| --- | --- | --- | --- |
| Hello runtime size | ~15 kB gzip core+theme (`why-domphy.md`) | ~42 kB React+DOM (`why-domphy.md`) | **Lead** |
| Build step | Optional; script-tag / CDN global possible (`why-domphy.md`) | JSX transform nearly universal | **Lead** for plugin/webview |
| TypeScript | First-class packages (tsup/vite builds) | First-class | **Parity** |
| Devtools | No React DevTools equivalent as first-party | Mature DevTools | **Lag** |
| Ecosystem hiring / SO | Small | Dominant | **Lag** |
| Monorepo gate | `pnpm run ci` + publish verify + readiness matrix (`STABLE-READINESS.md`) | Varies by org | **Parity** (engineering hygiene) |

**Opinion:** DX lag is **observability + ecosystem**, not edit-refresh for small apps.

---

## 3. Package × peer matrix

Source of package list: `STABLE-READINESS.md` peer matrix (all non-private `packages/*` + `create-domphy`).  
**Legend:** **Lead** = better default for Domphy’s target jobs · **Parity** = good enough / intentional port · **Lag** = material gap vs peer or React culture.

| Package | Version | Peer | Status | Evidence pointer |
| --- | --- | --- | --- | --- |
| `@domphy/core` | 0.20.2 | React / Solid runtime | **Lead** (plain object + patches + no VDOM); **Lag** concurrent ecosystem | `packages/core/README.md`, `AGENTS.md`, tests under `packages/core/tests/` |
| `@domphy/theme` | 0.20.2 | CSS vars / design tokens | **Lead** first-party context tones | `packages/theme/README.md`, `DESIGN.md` |
| `@domphy/ui` | 0.20.10 | Radix / shadcn | **Parity** primitives; **Lag** full a11y matrix | `packages/ui/README.md`, overlay tests (dialog focus) |
| `@domphy/floating` | 0.18.1 | Floating UI | **Parity** (vendored 1-1) | `packages/floating/README.md` |
| `@domphy/palette` | 0.19.0 | chroma.js / culori | **Lead** productized ramp + metrics | `packages/palette/README.md` |
| `@domphy/doctor` | 0.18.16 | eslint-plugin-jsx-a11y / Stylelint | **Lead** tree-level doctor + fix | `packages/doctor/README.md`, `AGENTS.md` rules list |
| `@domphy/query` | 0.18.1 | TanStack Query | **Parity** core; **Lag** devtools/persist | `packages/query/README.md` |
| `@domphy/table` | 0.19.0 | TanStack Table | **Parity** headless (+ editing feature) | `packages/table/README.md` |
| `@domphy/form` | 0.18.1 | TanStack Form / RHF | **Parity** headless | `packages/form/README.md` |
| `@domphy/virtual` | 0.18.1 | TanStack Virtual | **Parity** | `packages/virtual/README.md` |
| `@domphy/router` | 0.18.1 | TanStack Router | **Parity** core; **Lag** codegen | `packages/router/README.md`, `tests/ssr-server.test.ts` |
| `@domphy/dnd` | 0.18.4 | FormKit DnD | **Parity** list model | `packages/dnd/README.md` |
| `@domphy/app` | 0.18.2 | Next.js App Router | **Parity** feature set; **Lag** deploy/edge culture | `packages/app/README.md`, `packages/app/src/*` |
| `@domphy/blocks` | 0.1.4 | shadcn blocks + Magic UI | **Parity** 173 blocks | `packages/blocks/SOURCES.md` |
| `@domphy/chart` | 0.2.3 | ECharts / Recharts | **Parity** series surface; **Lag** toolbox/brush (honest warn) | `packages/chart/README.md`, STABLE P0-CHART-SURFACE |
| `@domphy/three` | 0.2.1 | @react-three/fiber | **Parity** R3F-class port | `packages/three/README.md` |
| `@domphy/editor` | 0.2.1 | Tiptap / ProseMirror | **Lead** Tiptap API without ProseMirror dep; **Lag** collab/IME stress | `packages/editor/README.md` |
| `@domphy/markdown` | 0.19.2 | react-markdown / MDX | **Parity** MD→tree; **Lag** MDX map docs | `packages/markdown/README.md` |
| `@domphy/mermaid` | 0.18.2 | mermaid + React wrappers | **Parity** build-time + client patch | `packages/mermaid/README.md` |
| `@domphy/press` | 0.21.10 | VitePress | **Parity** docs SSG | `packages/press/README.md` |
| `@domphy/i18n` | 0.19.2 | react-i18next | **Parity** reactive `t(l,key)` | `packages/i18n/README.md` |
| `@domphy/mcp` | 0.19.2 | MCP SDK (no React peer) | **Lead** Domphy-native agent tools | `packages/mcp/README.md` |
| `create-domphy` | 0.18.4 | create-vite / create-next-app | **Parity** starter + AGENTS.md | `packages/create-domphy/README.md` |

**Coverage check:** 23/23 publishable packages from STABLE-READINESS peer matrix appear above.

---

## 4. How to surpass React — prioritized playbook

Ranked by **leverage × uniqueness** for Domphy’s jobs (AI-built UI, plugins/tools, design-system apps). Not a feature dump.

### Lever 1 — Make the AI self-correction loop the product (DX/AI)

| | |
| --- | --- |
| **Outcome** | Agents produce **doctor-clean** Domphy UIs in 1–2 iterations more often than they produce working React+shadcn. |
| **Who benefits** | AI IDE users, internal agents building dashboards, codegen pipelines. |
| **Already have** | Plain-object syntax; `@domphy/doctor`; `AGENTS.md`; `llms.txt` / `llms-full.txt`; `@domphy/mcp`; `bench/` harness. |
| **Still need** | Published golden metrics from `bench/` (agent success rate Domphy vs React); default MCP in `create-domphy`; CI recipe “fail if diagnose fails”; more doctor rules for lifecycle/a11y footguns. |
| **Why beats React’s path** | React generation fails at JSX + hook rules + design-system assembly; Domphy generation fails at fewer syntax layers and has a **runtime-tree oracle**. |

### Lever 2 — Own “plugin / webview / no-build UI” (product)

| | |
| --- | --- |
| **Outcome** | Default choice for SketchUp/Figma/VS Code/browser-extension UIs with full theme + patches. |
| **Who benefits** | Extension authors who refuse React toolchain weight. |
| **Already have** | No-JSX model; CDN global bundles (`why-domphy.md`); small core+theme gzip story; UI patches. |
| **Still need** | First-party extension templates in `create-domphy`; documented CSP nonce path cookbook; size budgets CI-published. |
| **Why beats React’s path** | React’s default is app-shaped (bundler + JSX); Domphy’s default is **object-in-script**. |

### Lever 3 — Design-system integrity as a hard gate (product + DX)

| | |
| --- | --- |
| **Outcome** | Impossible to ship low-contrast / mid-ramp surfaces without explicit suppress — brand stays coherent under AI edits. |
| **Who benefits** | Design-system owners, multi-theme products, AI-edited UIs. |
| **Already have** | Theme API; palette science; doctor contrast/tone rules; `paper/` formalization; solid-role ramps distinct (STABLE notes). |
| **Still need** | Theme visual regression in CI; export kit for Figma tokens; one-command “audit whole app tree”. |
| **Why beats React’s path** | React leaves design system to the org; Domphy **ships and enforces** one. |

### Lever 4 — One-stack coherence without provider hell (ecosystem)

| | |
| --- | --- |
| **Outcome** | Install query+table+form+router+ui and get **one reactivity model**, no Context nesting tutorial. |
| **Who benefits** | Full-stack app teams who currently juggle React Query + RHF + React Router + theme provider. |
| **Already have** | Agnostic cores + `/domphy` adapters; `@domphy/app` Next-shaped layer. |
| **Still need** | End-to-end “SaaS starter” template (auth layout + table + form + query); deeper app deploy adapters; router Link/codegen DX. |
| **Why beats React’s path** | React wins on choice; loses on **integration tax**. Surpass = lower total integration cost for the 80% app. |

### Lever 5 — Document the hard truth (lifecycle + reconcile) until agents can’t fail it (DX/AI)

| | |
| --- | --- |
| **Outcome** | Zero recurring class of bugs where popovers/listeners close over generation-1 state after re-render. |
| **Who benefits** | Anyone shipping overlays/lists; agent authors. |
| **Already have** | `behavior()`; AGENTS.md “Reused-node lifecycle”; floating lifecycle matrix tests in UI. |
| **Still need** | Doctor rules that detect anti-patterns (state in patch factory without `behavior`); interactive docs playground that **forces** the bug then shows the fix. |
| **Why beats React’s path** | React’s equivalent footguns (stale closures, effect deps) are familiar; Domphy’s must become **as teachable** or agents will abandon the model. |

### Lever 6 — Blocks as “instant product surface” (ecosystem)

| | |
| --- | --- |
| **Outcome** | Ship marketing/dashboard/auth screens from factories without assembling 15 shadcn files. |
| **Who benefits** | Startups, AI landing generators, internal tools. |
| **Already have** | 173 blocks; SOURCES.md honesty; visual QA history. |
| **Still need** | Continuous visual CI (matrix P1); curated “top 20” starter pack in scaffolder. |
| **Why beats React’s path** | shadcn is copy-paste culture; Domphy blocks are **importable factories** on the same runtime. |

### Lever 7 — Honest specialized engines (editor / chart / three) without React peer tax (product)

| | |
| --- | --- |
| **Outcome** | Rich text, charts, 3D without dragging React or ProseMirror into the dependency graph. |
| **Who benefits** | Domphy-native apps that would otherwise dual-runtime. |
| **Already have** | Editor (Tiptap-compatible, self-contained); chart (WebGL+SVG); three (R3F-class). |
| **Still need** | Collab story for editor; broader chart feature honesty; three error-boundary recipes (P1s). |
| **Why beats React’s path** | R3F/Tiptap/Recharts assume React; Domphy ports remove the **React peer obligation**. |

---

## 5. Surpass gaps by severity

These are **strategy gaps for “surpass React”**, not STABLE-READINESS release-gate P0s (all matrix P0 = `none` as of this cut). Where a STABLE P1 overlaps, noted.

| ID | Severity | Gap | Overlap with STABLE? | Blocks which lever? |
| --- | --- | --- | --- | --- |
| S-AI-METRICS | **P0-strategy** | No published, continuous agent-success scorecard Domphy vs React from `bench/` | No | Lever 1 |
| S-A11Y-CI | **P1** | Not axe-on-every-patch; incomplete a11y proof vs Radix culture | Yes — ui P1 | Lever 3, credibility vs React |
| S-DEVTOOLS | **P1** | No first-party inspector for state/tree/patches | No | DX adoption |
| S-STARTER-SAAS | **P1** | No full-app starter (auth+data+table+form) beyond Vite sample | Partial — create-domphy P1 templates | Lever 4 |
| S-APP-DEPLOY | **P1** | Deploy/edge adapters & cookbooks lag Next culture | Yes — app P1 | Lever 4 |
| S-LIFECYCLE-DOCTOR | **P1** | Doctor does not yet flag `behavior()`-required patterns | No | Lever 5 |
| S-VISUAL-CI | **P1** | Blocks full visual re-baseline not continuous CI | Yes — blocks P1 | Lever 6 |
| S-ECOSYSTEM | **P2** | Third-party React-only libraries still force dual stack | No | “Replace React entirely” narratives |
| S-HIRING | **P2** | Talent market / community Q&A density | No | Enterprise FOMO |
| S-CONCURRENT | **P2** | No React-19-class concurrent UI story | Partial — core P1 SSR streaming | Niche high-end UIs |
| S-EDITOR-COLLAB | **P2** | Collaborative editing not a product story | Yes — editor P1/P2 | Lever 7 edge |

**Explicit non-confusion:** STABLE-READINESS P0-PUBLISH / P0-CI / etc. are **release readiness**. Strategy P0 above means “without this, marketing ‘better than React for AI’ is unproven,” **not** “block npm publish.”

---

## 6. Sources

### In-repo (primary)

| Path | Used for |
| --- | --- |
| `AGENTS.md` | Runtime rules, package map, doctor rules, lifecycle contract |
| `STABLE-READINESS.md` | Peer matrix, versions, P0/P1/P2, release policy |
| `README.md` | Public positioning, AI loop, package list |
| `apps/web/docs/guide/why-domphy.md` | Comparison table, bundle sizes, fit cases |
| `apps/web/docs/guide/from-react.md` | Concept translation |
| `DESIGN.md` / `paper/` | Theme/spacing formal model |
| `packages/*/README.md` | Per-package public contract |
| `packages/blocks/SOURCES.md` | 173 blocks clean-room methodology |
| `bench/`, `bench/generated.json` | Agent generation harness exists |
| `packages/app/src/*` | App Router-shaped module surface |

### External peers (reference; not fully re-verified upstream this session)

| Peer | Canonical docs (reference) | Session status |
| --- | --- | --- |
| React | https://react.dev | **repo-only / not re-verified upstream this session** for API minutiae |
| Next.js App Router | https://nextjs.org/docs/app | same |
| Radix UI | https://www.radix-ui.com/primitives/docs/overview/introduction | same |
| shadcn/ui | https://ui.shadcn.com | same |
| TanStack Query/Table/Router/Form/Virtual | https://tanstack.com | same |
| Floating UI | https://floating-ui.com | same (vendored; README asserts 1-1) |
| Tiptap | https://tiptap.dev | same |
| @react-three/fiber | https://docs.pmnd.rs/react-three-fiber | same |

---

## Bottom line (Opinion)

Domphy does **not** need to become React to surpass React. It needs to **double down** on the axes where React is structurally weak:

1. **Representation** plain enough for agents + **oracle** (doctor/MCP) that closes the loop.  
2. **Design system** that is native and enforceable.  
3. **Stack coherence** that removes provider/integration tax for tool apps.  
4. **Honest specialization** (editor/chart/three) without a React peer.

Release-stable packages (gate green on `main`) are the floor. Surpassing React is a **product narrative + measurable AI win + a11y/deploy polish**, not another 200 primitives.
