# bench-krausest — js-framework-benchmark-style perf lane for Domphy

Keyed-league implementation of the canonical krausest table for `@domphy/core`,
plus a local playwright timing harness and a CDP profiler. Private package,
**not** part of the pnpm workspace; reuses repo tooling (esbuild, playwright
from `apps/web`) via `createRequire`.

## Layout

```
bench-krausest/
  index.html            # krausest-style shell; loads /dist/main.js
  vanilla.html          # same shell with static skeleton for the vanilla control
  css/                  # bootstrap.min.css + main.css fetched from the krausest repo
  src/main.ts           # Domphy implementations: ?impl=fine (default) | tuned | coarse
  src/vanilla.ts        # vanilla-DOM control (port of krausest vanillajs reference)
  build.mjs             # node build.mjs -> dist/{main.js, main.profile.js, vanilla.js}
  harness/serve.mjs     # static server (port 4190)
  harness/run.mjs       # timing harness: node harness/run.mjs  (env: IMPLS=... RUNS=...)
  harness/profile.mjs   # CDP CPU profiler: node harness/profile.mjs <op> [impl]
  harness/check-rules.mjs # CSSOM rule-count diagnostic (empty-rule churn proof)
```

## Variants

- `fine` — idiomatic fine-grained: one keyed `State<Row[]>` for the list;
  per-row `label`/`selected` states. Partial update touches only every 10th
  row's label state; select touches only old/new row.
- `memo` — `fine` + each row's element descriptor created ONCE per row and
  reused across list re-renders (WeakMap row → element). With core's
  descriptor reference-equality fast path, unchanged rows skip patching
  entirely on reorder/remove.
- `tuned` — `fine` + imperative `tbodyNode.children.swap(1, 998)` /
  `children.remove(...)` for the swap/remove ops (model array mutated in
  place), skipping the full-list reconciliation patch pass.
- `coarse` — naive idiom: single `State<Row[]>` of plain objects + selected-id
  state; every mutation re-runs full keyed reconciliation.
- `vanilla` — direct DOM (cloneNode template + delegation), the browser floor.

## Methodology

Per op: `performance.now()` bracket around a synchronous `.click()` dispatch,
then `flushSync()` (drain Domphy's reactivity queue) + a forced synchronous
layout (`offsetHeight` read). Median of N fresh page loads. This approximates
"DOM update + style/layout"; the official krausest driver additionally waits
for paint, so these numbers are a lower bound relative to the published table.
Chromium via playwright 1.62, headless, no CPU throttling.

## Results

Median of 3 runs (ms), fresh Chromium per run (playwright 1.62, headless,
Windows, no CPU throttling). Timing bracket: `click()` dispatch → `flushSync()`
→ forced sync layout (`offsetHeight`). Lower bound vs the official krausest
methodology (which additionally waits for paint).

| op | vanilla (floor) | fine | tuned | coarse |
|---|---|---|---|---|
| create 1k | 56.0 | 172.7 | 169.7 | 182.6 |
| replace 1k | 68.4 | 167.1 | 166.0 | 158.3 |
| partial update | 8.0 | 9.5 | 10.6 | 96.2 |
| select row | 0.4 | 0.4 | 0.3 | 1.9 |
| swap rows | 6.8 | 148.1 | 7.2 | 100.6 |
| remove row | 7.3 | 106.7 | 8.5 | 104.9 |
| append 1k | 62.5 | 206.3 | 238.2 | 217.3 |
| create 10k | 621.8 | 1528.1 | 1398.1 | 1309.0 |
| clear 10k | 68.1 | 234.5 | 371.0 | 337.3 |

Harness note: reusing one browser process across runs produced monotonic
slowdown (~1.5-2x inflation by run 5); a fresh browser per run is required
for stable medians. Run-to-run spread is still ~±15% on this machine.

Reading:
- `fine`/`tuned` match the vanilla floor on partial update, select, and
  (tuned) swap/remove — the fine-grained reactivity itself is competitive.
- Create ops run at ~2.2-3x the vanilla floor: per-node construction
  machinery (deepClone, validate, nodeId hashing, scope-class setAttribute,
  getTagName linear scan) dominates — see findings below.
- Reactive swap/remove cost 15-20x the floor because `ElementList.update`
  re-patches every reused row (finding 3); imperative `children.swap` /
  `children.remove` (`tuned`) lands at the floor.
- `coarse` beats `fine` on create 10k (1309 vs 1528): 20k per-row `State`
  objects cost ~200 ms. Per-row states pay off only when partial updates
  dominate (partial update: 9.5 vs 96.2 ms).

## Core-level findings (for a follow-up lane — core source NOT modified here)

1. **Empty-CSS-rule churn on every reconciliation patch.**
   `ElementNode.patch()` calls `this.styles.patchCSS(element.style || {}, …)`
   unconditionally (`packages/core/src/classes/ElementNode.ts:355`).
   `StyleList.patchCSS` (`packages/core/src/classes/StyleList.ts:113-143`)
   creates a `StyleRule` when none exists **even when the style object has no
   flat properties**, and if the node is mounted inserts it into the CSSOM
   (`rule.render(sheet)` → `insertRule(".tr_xxx {  }")`, lines 141-142).
   Net effect: the first reconciliation pass over a 1,000-row table inserts
   ~1,000 empty CSS rules. Construction (`addCSS`) correctly guards empty
   blocks (line 84); `patchCSS` is missing the same guard.
   **Empirically confirmed** (`node harness/check-rules.mjs`): boot = 1195
   rules (bootstrap), create 1k = 1195 (construction path is clean), one swap
   = **9195 rules** (+8000 = 8 nodes/row × 1000 rows, one empty rule per
   patched node), clear = 1195 again.

2. **O(rules) CSSOM removal per disposed node → O(n²) clear.**
   `ElementNode._dispose` calls `rule.remove()` per rule
   (`ElementNode.ts:224`); `StyleRule.remove`
   (`packages/core/src/classes/StyleRule.ts:84-96`) linearly scans
   `sheet.cssRules` to find its index before `deleteRule`. After a patch pass
   has created per-node rules (finding 1), clearing N rows costs N scans over
   an N-rule sheet. CDP profile of swap+clear: `deleteRule` 8.6% self time,
   `insertRule` 2.7%.

3. **Full re-patch of every reused node on any list change.**
   `ElementList.update` (`packages/core/src/classes/ElementList.ts:191`) calls
   `reused.patch(input)` for every keyed match, and `patch()`
   (`ElementNode.ts:320-…`) rebuilds all attributes/events and re-runs
   children reconciliation per row — even when the row's data did not change
   (e.g. removing one row re-patches the other 999). Measured: reactive swap
   193 ms / remove 184 ms vs imperative `children.swap`/`remove` 12/15 ms —
   ~94% of those ops is patch overhead. A cheap per-input "descriptor
   unchanged" skip (reference equality, or a dirty flag) would close most of
   it for the benchmark shape.

4. **`deepClone` of every descriptor, on create AND on patch.**
   `ElementNode` constructor (`ElementNode.ts:83`) and `patch()`
   (`ElementNode.ts:321`) recursively clone the entire element tree input.
   ~6% self time on create-10k plus visible GC pressure (GC ~5-8%). For
   freshly-allocated per-render descriptors this is pure overhead; needs an
   ownership/copy-on-write decision in core.

5. **Per-node hashing + scope-class + `getTagName` linear scan.**
   Every node computes `nodeId = hashString(tempPath + JSON.stringify(style))`
   (`ElementNode.ts:94-98`) and sets a `tag_nodeId` scope class via
   `setAttribute` even with no styles; `getTagName`
   (`packages/core/src/helpers.ts:398-402`) does
   `Object.keys(el).find(k => HtmlTags.includes(k))` — a linear scan of the
   138-entry `HtmlTags` array per key per node (a `Set` lookup fixes it).
   On create-10k: `hashString` ~1.4%, native `setAttribute` ~5.1% self.

## External comparison

The published Chrome-137 results page
(`https://krausest.github.io/js-framework-benchmark/2025/table_chrome_137.0.7151.55.html`)
is a JS-rendered SPA whose data JSON could not be located/fetched; per task
instructions the external comparison is skipped. The in-harness `vanilla`
control serves as the reference point instead (it mirrors the krausest
vanillajs-keyed implementation, which historically sits at/near the top of
the keyed table).

## Follow-up: core optimizations applied (findings 1-5)

Core fixes landed in `@domphy/core` after the baseline above was measured:

1. **Empty-rule guard** — `StyleList.patchCSS` returns early when there are
   no flat properties and no existing rule (same guard `addCSS` had).
   Verified with `node harness/check-rules.mjs`: swap now adds **0** rules
   (was +8,000). `StyleRule.remove()` also got an insertion-index hint with
   identity verification, falling back to the linear scan only when stale.
2. **Descriptor reference-equality fast path** — `ElementNode.patch()`
   returns immediately when re-patched with the exact same descriptor object
   (`_descriptor` field). Reactive functions inside a skipped descriptor keep
   their own state subscriptions and update normally; in-place mutation of a
   descriptor between renders is the documented non-goal (descriptors are
   one-way render snapshots). NOTE: finding 3 assumed the benchmark shape had
   stable descriptor references — it does not: `rows: (l) => data.get(l).map(rowElement)`
   regenerates every descriptor per render, so the fast path only fires for
   the new `memo` variant (and real apps that memoize item descriptors).
3. **Deferred minimal-move keyed reconciliation** — the profiler showed the
   fast path alone was not enough: `ElementList.update` moved every matched
   keyed node eagerly, so one row removal cascaded into ~996 `insertBefore`s
   and a full-tbody style recalc (`nth-of-type` striping). Keyed moves are
   now applied logically during the match loop and flushed once at the end by
   `_placeKeyedDom`, which moves only nodes outside the LIS of old positions
   (removal = 0 DOM moves, two-row swap = 2 — same as vanilla).
4. **Construction hashing** — `nodeId` skips `JSON.stringify` when the style
   block is empty; `getTagName`/`validate` use a precomputed `Set` instead of
   scanning the 138-entry `HtmlTags` array; constructor/patch clone the
   descriptor WITHOUT deep-cloning the children content (each child node
   clones its own descriptor), removing the O(depth) per-node re-clone.

Same-session A/B (median of 5 fresh browsers each; this machine had
background load, so absolute numbers run ~15-40% above the baseline session
— compare within a row, vanilla column included as the control):

| op | vanilla (HEAD → patched) | fine (HEAD → patched) | memo (patched) | coarse (HEAD → patched) |
|---|---|---|---|---|
| create 1k | 84.0 → 63.9 | 206.2 → 145.3 | 173.6 | 193.4 → 160.9 |
| replace 1k | 87.2 → 72.1 | 190.8 → 149.1 | 170.1 | 187.8 → 169.3 |
| partial update | 10.1 → 9.9 | 11.6 → 7.7 | 15.0 | 121.0 → 55.6 |
| select row | 0.4 → 0.4 | 0.4 → 0.4 | 0.5 | 2.6 → 2.8 |
| swap rows | 9.4 → 7.8 | 186.4 → 36.8 | **12.6** | 121.0 → 45.3 |
| remove row | 9.6 → 8.6 | 141.6 → 36.0 | **12.6** | 119.6 → 41.3 |
| append 1k | 70.2 → 72.0 | 312.6 → 180.1 | 156.4 | 273.8 → 166.3 |
| create 10k | 790.1 → 641.9 | 1745.1 → 1409.6 | 1364.1 | 1810.7 → 1431.7 |
| clear 10k | 70.0 → 65.2 | 369.4 → 248.9 | 230.5 | 330.0 → 283.9 |

(HEAD and patched columns are from two back-to-back RUNS=5 sessions; the
memo column and the patched fine/coarse numbers are from the final run,
whose vanilla column was load-inflated — raw runs are in the harness output.
memo swap/remove raw runs: 10.7-14.3 ms / 10.6-13.1 ms uncontended.)

Reading:
- `memo` swap/remove land at ~12.6 ms — at/below this session's vanilla
  floor (7-15 ms) and within ~1.5x of the 7-9 ms imperative floor from the
  baseline session. Target met for apps with stable (memoized) item
  descriptors.
- `fine` (descriptors regenerated per render) still pays a full re-patch per
  surviving row, but the LIS reconciliation + empty-rule guard cut swap/
  remove ~4x (186 → 37 ms). Going further requires semantic-risky structural
  comparison of closures — deliberately not done.
- create 10k ~1.9x vanilla (was ~2.2x): remaining cost is per-node
  construction machinery (ElementAttribute/scope-class setAttribute, event
  binding). Reaching 1.5x would require dropping the scope class on
  style-less nodes, which changes observable class attributes — not taken.
- clear 10k ~3.5x vanilla: per-node dispose (subscription releases,
  BeforeRemove hooks, 20k per-row States in fine/memo). Improved ~30%.
