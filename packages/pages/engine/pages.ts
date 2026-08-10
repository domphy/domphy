/**
 * Pages lane — interactive screen UI that travels WITH the model (see
 * schema/model.ts's PageJSON doc). v33 (2026-07-22): a page's content is an
 * ordinary NodeJSON operations tree — `element`/`text` methods (or a
 * container fragment), the same recursive shape every other lane uses —
 * instead of a bespoke `PageElementJSON` element tree (see schema/model.ts's
 * module doc for the exact grammar). The engine side here is HEADLESS — no
 * DOM, no Domphy import:
 *
 *   resolvePage(page, scope, state)  — snapshot resolve: seeds the page's
 *     initial `state` from `page.parameters` (node-shaped, same law as
 *     ComponentJSON/TextureJSON's own parameters lane — see PageJSON's doc in
 *     schema/model.ts), then walks `page.operations` and evaluates every arg
 *     per its key's law; event values resolve to REAL FUNCTIONS the host
 *     runtime wires as listeners.
 *   pageErrors(pages)                — validate pass: only `element`/`text`
 *     (or a container) are legal methods; each arg key must be a recognized
 *     name, with the events-are-arrows law + a static (best-effort, only
 *     when parseable) vocabulary check on `style`/`patches` — precise path
 *     per error.
 *
 * ARG GRAMMAR (an `element` node's `args`): `tag` (required, the PAGE_TAGS
 * member — a plain value like every other arg, so it MAY be an expression;
 * checked against the whitelist only when it's a static string literal),
 * one arg PER attribute (key = a PAGE_ATTRIBUTES name) or event (key = a
 * PAGE_EVENTS name, value = an arrow expression), `style` (ONE
 * object-expression carrying the whole nested CSS-in-JS structure, incl.
 * selector keys `&:hover`/`@media …`/`@keyframes …` — validated statically
 * when the expression parses as an object literal), `patches` (ONE
 * object-expression, `{ popover: {...} }` — same popover vocabulary as
 * before), `children` (an expression generating a DYNAMIC subtree — see
 * "generated nodes" below). The node's own `children` FIELD (schema/model.ts
 * — the same field documents[] container blocks use) carries the STATIC
 * subtree; the `children` ARG wins when both are present. A `text` node's
 * `args` carries `value` only.
 *
 * VALUE LAW (every attribute/style/patches/tag/text-value arg, and a page
 * parameter's own default expression, and `title`): expression-first with
 * literal fallback — the string is parsed+evaluated as an engine expression,
 * and if parse OR eval throws the value IS the literal string. "8px" and
 * "'8px'" both work; "'W = ' + width" interpolates; a typo'd reference
 * renders as its own source text (visible, debuggable) instead of crashing
 * the page. `style`/`patches` are each ONE such value — they must be a
 * SINGLE parseable expression (so every nested leaf is valid JS syntax;
 * "gap: '8px'" not "gap: 8px") — a value that fails to parse/eval as an
 * object is simply inert (no style/patches applied), never a crash.
 * Events are CODE by definition — no fallback, validated up front.
 *
 * GENERATED NODES (the value of a `children` arg, or of `patches`'s
 * `popover.content` field): whatever a `children`/`patches` expression
 * PRODUCES is already-resolved data (real values, real functions for event
 * args — it came out of ONE evaluate() call), not further expression
 * strings — `GeneratedPageNode = string | { method, args?: {key,value}[],
 * children? }`, mirroring authored NodeJSON's own shape (`args` an array of
 * key/value pairs, `children` the nested list) but with resolved VALUES
 * instead of expression INPUTS. A bare string is text shorthand. The live
 * runtime (@parashape/pages) is the only consumer that turns this into real
 * DOM — the headless resolver below passes it through untouched (same as it
 * always has for a dynamic `children` value).
 *
 * The LIVE runtime (fine-grained reactivity via Domphy RecordState) lives in
 * @parashape/pages — a standalone package depending on @domphy/core only
 * (+ a lazy @floating-ui/dom import for the one bundled `popover` patch); it
 * reuses evaluatePageExpression/evaluatePageValue below per string so both
 * paths share ONE evaluation semantics; the engine snapshot here is what
 * tests/SSR/thumbnails use.
 *
 * Event law (host runtime contract, documented here as the SSOT): an event
 * expression is an arrow; its RETURN drives the runtime — a plain OBJECT is
 * a state patch (merged into the page state), an ARRAY is an effect for the
 * host vocabulary (e.g. ['navigate', 'checkout'], ['setParam', 'width',
 * 1200]), an array of arrays is several effects. Anything else is ignored
 * (fail-soft).
 */
import { createTableNamespace, StatsNamespace } from "./domains/tableNamespace.js"
import { type EvalContext, evaluate, parse } from "./expression.js"
import { encodeBase64 } from "./ref.js"
import { PARAM_VALUE_ARG } from "./schema/vocabulary/constants.js"
import { isContainerJSON, type NodeJSON, type OperationJSON } from "./schema/model.js"
import type { PageJSON } from "./schema/model.js"
import {
    PAGE_ATTRIBUTE_SET,
    PAGE_EVENT_SET,
    PAGE_KEYFRAME_STEP,
    PAGE_PATCH_SET,
    PAGE_POPOVER_PLACEMENTS,
    PAGE_STYLE_PROPERTY_SET,
    PAGE_STYLE_SELECTOR,
    PAGE_TAG_SET,
} from "./schema/vocabulary/pageVocabulary.js"

/** What page expressions see, beyond the page's own `state`. The host builds
 *  this once per model (Model.evaluatePage wires params + Table.get). An
 *  attached file's url is just its url-method parameter's value — a page
 *  reads it by bare key like any other parameter. */
export type PageScope = {
    /** Model parameter values by key (live — a getter-backed object is fine). */
    params?: Record<string, unknown>
    /** Table.get('key') hook — same contract as ExpressionNode's context. */
    resolveTable?: (key: string) => unknown
    /** Expression namespaces (Point.*, Format.*, Color.*, …). */
    namespaces?: Record<string, unknown>
    /** Resolve one views[] entry to a standalone SVG document (wired by
     *  Model). A page is a live SCREEN, so a drawing reaches it the same way
     *  it reaches paper: through a VIEW. The page never touches the scene or
     *  a component's body — it names a view, the view owns the projection. */
    resolveViewSvg?: (key: string) => string | undefined
    /** Extra host-injected names (patch factories, themeSpacing, …) — the
     *  UI runtime's business; the engine just passes them through. */
    extra?: Record<string, unknown>
}

function buildContext(scope: PageScope, state: Record<string, unknown>): EvalContext {
    const context: EvalContext = {}
    for (const [key, value] of Object.entries(scope.params ?? {})) context[key] = value
    for (const [key, value] of Object.entries(scope.extra ?? {})) context[key] = value
    context.state = state
    // The SAME namespace factory ExpressionNode._buildContext uses — a page
    // expression is an expression, so Table.rows/row/column/cell/find/count
    // must not silently be missing just because this context is built here.
    // Stats.* is unconditional there too (pure aggregates over a rows array).
    // Deliberately NO Scene/Material: a page reaches parameters, tables and
    // views, and nothing else (schema/references.ts's pages edges).
    if (scope.resolveTable) {
        const resolveTable = scope.resolveTable
        context.Table = createTableNamespace(resolveTable)
    }
    context.Stats = StatsNamespace
    return context
}

/** Evaluate ONE expression string against the page scope + state. Shared by
 *  the snapshot resolver below and the live UI runtime (which re-calls it
 *  inside a reactive listener). Throws on parse/eval errors — the EVENTS/
 *  PATCHES/STYLE path, where a string is code by definition. */
export function evaluatePageExpression(
    expression: string,
    scope: PageScope,
    state: Record<string, unknown>,
): unknown {
    return evaluate(parse(expression), buildContext(scope, state), scope.namespaces)
}

/** The VALUE law: expression-first, literal fallback. Used for every
 *  attribute/tag/text-value arg, `title`, and a page parameter's default. */
export function evaluatePageValue(
    raw: string,
    scope: PageScope,
    state: Record<string, unknown>,
): unknown {
    try {
        return evaluatePageExpression(raw, scope, state)
    } catch {
        return raw
    }
}

/** A `children`/`patches` arg is ONE object/array-shaped value — evaluate it
 *  and keep it only when it actually resolved to a plain object (a failed
 *  parse/eval, or a non-object result, makes the arg inert rather than a
 *  crash — same "value law" tolerance as every other arg). */
function resolveObjectValue(raw: string, scope: PageScope, state: Record<string, unknown>): Record<string, unknown> | undefined {
    const value = evaluatePageValue(raw, scope, state)
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

// Page resolved types live in graph/page.ts (isolation).
export type {
    ResolvedPagePopover, GeneratedPageNode, ResolvedPageElement,
    ResolvedPageChild, ResolvedPageValue, ResolvedPage,
} from "./graph/page.js"
import type { ResolvedPagePopover, ResolvedPageElement, ResolvedPage } from "./graph/page.js"

function resolvePatches(raw: string, scope: PageScope, state: Record<string, unknown>): { popover?: ResolvedPagePopover } | undefined {
    const value = resolveObjectValue(raw, scope, state)
    const popover = value?.popover
    return popover && typeof popover === "object" ? { popover: popover as ResolvedPagePopover } : undefined
}

const ELEMENT_META_ARGS = new Set(["tag", "style", "patches", "children"])

function argInput(node: OperationJSON, key: string): string | undefined {
    return node.args?.find(a => a.key === key)?.input
}

function resolveElementNode(node: OperationJSON, scope: PageScope, state: Record<string, unknown>): ResolvedPageElement {
    const tagInput = argInput(node, "tag")
    const out: ResolvedPageElement = { tagName: String((tagInput ? evaluatePageValue(tagInput, scope, state) : "div") ?? "div") }
    if (node.key !== undefined) out.key = node.key

    const childrenInput = argInput(node, "children")
    if (childrenInput !== undefined) {
        // children ARG may produce GeneratedPageNode[] / strings / numbers —
        // adopt only array-shaped results into the resolved tree.
        const generated = evaluatePageValue(childrenInput, scope, state)
        if (Array.isArray(generated)) {
            out.children = generated as import("./graph/page.js").ResolvedPageChild[]
        }
    } else if (node.children?.length) {
        out.children = resolveNodeList(node.children, scope, state)
    }

    const attributes: Record<string, unknown> = {}
    const events: Record<string, (...args: unknown[]) => unknown> = {}
    for (const arg of node.args ?? []) {
        const key = arg.key
        if (ELEMENT_META_ARGS.has(key)) continue
        if (PAGE_EVENT_SET.has(key)) {
            const handler = evaluatePageExpression(arg.input, scope, state)
            if (typeof handler === "function") events[key] = handler as (...a: unknown[]) => unknown
            continue
        }
        if (PAGE_ATTRIBUTE_SET.has(key)) attributes[key] = evaluatePageValue(arg.input, scope, state)
    }
    if (Object.keys(attributes).length) out.attributes = attributes
    if (Object.keys(events).length) out.events = events

    const styleInput = argInput(node, "style")
    if (styleInput !== undefined) {
        const style = resolveObjectValue(styleInput, scope, state)
        if (style) out.style = style
    }
    const patchesInput = argInput(node, "patches")
    if (patchesInput !== undefined) {
        const patches = resolvePatches(patchesInput, scope, state)
        if (patches) out.patches = patches
    }
    return out
}

/** Walk a list of NodeJSON (a page's root `operations`, or an element's own
 *  static `children` field) into resolved content: `enabled` gates a node
 *  out entirely (falsy = contributes nothing); a container is a transparent
 *  fragment (its own `operations` splice in); `text` resolves to a plain
 *  string; `element` resolves via resolveElementNode. Shared by the page
 *  root and every element's static subtree — ONE recursive rule, same
 *  "container = transparent fragment" law every other lane uses. */
function resolveNodeList(nodes: NodeJSON[], scope: PageScope, state: Record<string, unknown>): import("./graph/page.js").ResolvedPageChild[] {
    const out: import("./graph/page.js").ResolvedPageChild[] = []
    for (const node of nodes) {
        if (node.enabled !== undefined && !evaluatePageValue(node.enabled, scope, state)) continue
        if (isContainerJSON(node)) {
            out.push(...resolveNodeList(node.operations, scope, state))
            continue
        }
        if (node.method === "pageView") {
            // A view renders as an ordinary <img> holding an inline SVG data
            // URI — sanitizeUrl already allows data:, so this needs no new
            // escape hatch in the runtime's whitelist and no innerHTML.
            const sourceInput = argInput(node, "source")
            const key = sourceInput === undefined ? "" : String(evaluatePageValue(sourceInput, scope, state) ?? "")
            const svg = key ? scope.resolveViewSvg?.(key) : undefined
            if (svg === undefined) continue
            out.push({
                tagName: "img",
                attributes: { src: `data:image/svg+xml;base64,${encodeBase64(svg)}`, alt: key },
                children: [],
            } as import("./graph/page.js").ResolvedPageChild)
            continue
        }
        if (node.method === "pageText") {
            const valueInput = argInput(node, "value")
            const text = valueInput !== undefined ? evaluatePageValue(valueInput, scope, state) : ""
            // Keep primitive result (number/boolean) — value law; do not String-coerce.
            out.push((text ?? "") as import("./graph/page.js").ResolvedPageChild)
            continue
        }
        out.push(resolveElementNode(node, scope, state))
    }
    return out
}

/** Seed a page's initial `state` from its `parameters` (node-shaped — see
 *  PageJSON's doc): each entry's key becomes one `state.<key>` binding, its
 *  value the PRIMARY arg's expression evaluated under the value law (parse +
 *  eval, literal fallback on failure) against the HOST-VISIBLE page scope —
 *  the same law/visibility every other page expression gets, and (unlike a
 *  component/pattern's isolated parameters) NOT an isolated function-call
 *  scope: a page is a model-bound singleton, so its parameter defaults may
 *  read model params by bare key and Table.get, same as `title`/`children`.
 *  Entries evaluate independently (never see a sibling's OWN value) — same
 *  behavior the old flat `state: Record<string,string>` map had.
 *  ponytail: reads only the primary arg via PARAM_VALUE_ARG (the plain
 *  registry-free constant, not the full ParameterNode/registry compute
 *  pipeline) — a registry-`compute`-backed method (curve/surface) would only
 *  get its raw first arg, never properly assembled; not a realistic need for
 *  page state, so no registry dependency was added here to cover it. A
 *  container entry (display grouping in every other parameters lane) is
 *  skipped — pages don't need parameter grouping, so it seeds nothing. */
export function resolvePageParameters(parameters: NodeJSON[] | undefined, scope: PageScope): Record<string, unknown> {
    const state: Record<string, unknown> = {}
    for (const node of parameters ?? []) {
        if (isContainerJSON(node) || !node.key) continue
        const primary = node.args?.find(a => a.key === PARAM_VALUE_ARG)
        if (!primary) continue
        state[node.key] = evaluatePageValue(primary.input, scope, {})
    }
    return state
}

/** Snapshot-resolve one page: seed `state` from `parameters`, then walk the
 *  whole `operations` tree against that state. */
export function resolvePage(page: PageJSON, scope: PageScope, stateOverride?: Record<string, unknown>): ResolvedPage {
    const state = resolvePageParameters(page.parameters, scope)
    Object.assign(state, stateOverride)
    const title = page.title ? String(evaluatePageValue(page.title, scope, state) ?? page.key) : page.key
    return {
        key: page.key,
        label: title,
        value: {
            title,
            state,
            children: resolveNodeList(page.operations, scope, state),
        },
    }
}

// ─── Event result interpretation (the runtime contract, one place) ───

export type PageEffect = { action: string; args: unknown[] }
export type EventOutcome = { patch?: Record<string, unknown>; effects: PageEffect[] }

/** Interpret an event expression's RETURN value per the event law (module
 *  doc): object = state patch, array = one effect or a list of effects.
 *  Fail-soft: unrecognized shapes yield an empty outcome. */
export function interpretEventResult(result: unknown): EventOutcome {
    const outcome: EventOutcome = { effects: [] }
    const asEffect = (value: unknown): PageEffect | null => {
        if (!Array.isArray(value) || typeof value[0] !== "string") return null
        return { action: value[0], args: value.slice(1) }
    }
    if (Array.isArray(result)) {
        const single = asEffect(result)
        if (single && !Array.isArray(result[0])) outcome.effects.push(single)
        else for (const item of result) {
            const effect = asEffect(item)
            if (effect) outcome.effects.push(effect)
        }
    } else if (result && typeof result === "object") {
        outcome.patch = result as Record<string, unknown>
    }
    return outcome
}

// ─── Validation (vocabulary + per-arg laws over the whole lane) ───────

export type PageError = { path: string; message: string }

// jsep's Expression type is intentionally loose (`{type: string, [k: string]:
// any}`) — the same duck-typed access pattern the rest of this file already
// uses for the event-law check (`parse(expression).type`).
type AstLike = { type: string; [key: string]: unknown }

function tryParseObject(expr: string): AstLike | null {
    try {
        const ast = parse(expr) as unknown as AstLike
        return ast.type === "ObjectExpression" ? ast : null
    } catch {
        return null
    }
}

function objectEntries(ast: AstLike): { key: string; value: AstLike }[] {
    const properties = (ast.properties as { key: AstLike; value: AstLike }[] | undefined) ?? []
    return properties.map(p => ({
        key: p.key.type === "Identifier" ? String(p.key.name) : String((p.key as unknown as { value: unknown }).value),
        value: p.value,
    }))
}

/** `style` arg's static vocabulary check — walked over the parsed AST (never
 *  evaluated), only when the whole expression parses as an object literal
 *  (see the value-law tolerance in the module doc: an unparseable style is
 *  inert at runtime, not an error here). Mirrors the pre-v33 walkStyle,
 *  retargeted from a JSON tree onto jsep's ObjectExpression tree. */
function walkStyleAst(ast: AstLike, path: string, out: PageError[]): void {
    for (const { key, value } of objectEntries(ast)) {
        const valuePath = `${path}.${key}`
        if (value.type === "ObjectExpression") {
            if (key.startsWith("@keyframes")) {
                for (const step of objectEntries(value)) {
                    if (!PAGE_KEYFRAME_STEP.test(step.key)) {
                        out.push({ path: `${valuePath}.${step.key}`, message: `keyframe step must be "from", "to" or "N%"` })
                    } else if (step.value.type !== "ObjectExpression") {
                        out.push({ path: `${valuePath}.${step.key}`, message: "keyframe step must be an object of CSS properties" })
                    } else {
                        walkStyleAst(step.value, `${valuePath}.${step.key}`, out)
                    }
                }
            } else if (PAGE_STYLE_SELECTOR.test(key)) {
                walkStyleAst(value, valuePath, out)
            } else {
                out.push({ path: valuePath, message: `nested style key "${key}" must be "&…" (e.g. "&:hover"), "@media …" or "@keyframes …"` })
            }
        } else if (!PAGE_STYLE_PROPERTY_SET.has(key)) {
            out.push({ path: valuePath, message: `unknown CSS property "${key}"` })
        }
    }
}

const POPOVER_FIELDS = new Set(["content", "openOn", "open", "placement", "strategy", "offset", "flip", "shift", "hide", "inline", "autoUpdate"])
const POPOVER_ENUM_FIELDS: Record<string, readonly string[]> = {
    openOn: ["click", "hover"],
    placement: PAGE_POPOVER_PLACEMENTS,
    strategy: ["absolute", "fixed"],
}

/** `patches` arg's static vocabulary check — same "walk only when parseable"
 *  tolerance as style. Content's own element vocabulary is NOT statically
 *  checked here (it's generated data, not authored structure — the live
 *  runtime's defense-in-depth sanitization is what actually guards it, same
 *  as any other `children`-expression output). */
function walkPatchesAst(ast: AstLike, path: string, out: PageError[]): void {
    for (const { key, value } of objectEntries(ast)) {
        const valuePath = `${path}.${key}`
        if (!PAGE_PATCH_SET.has(key)) {
            out.push({ path: valuePath, message: `unknown patch "${key}" — allowed: ${[...PAGE_PATCH_SET].join(", ")}` })
            continue
        }
        if (value.type !== "ObjectExpression") continue
        for (const field of objectEntries(value)) {
            const fieldPath = `${valuePath}.${field.key}`
            if (!POPOVER_FIELDS.has(field.key)) {
                out.push({ path: fieldPath, message: `unknown popover option "${field.key}"` })
                continue
            }
            const enumValues = POPOVER_ENUM_FIELDS[field.key]
            if (enumValues && field.value.type === "Literal" && !enumValues.includes(String((field.value as unknown as { value: unknown }).value))) {
                out.push({ path: fieldPath, message: `"${field.key}" must be one of ${enumValues.join(", ")}` })
            }
        }
    }
}

function describeParseError(error: unknown): string {
    return (error as { description?: string }).description ?? String(error)
}

function walkPageNode(node: NodeJSON, path: string, out: PageError[]): void {
    if (isContainerJSON(node)) {
        node.operations.forEach((child, i) => walkPageNode(child, `${path}.operations[${i}]`, out))
        return
    }
    // Stale names → named migrate pointers (hard cutover, no runtime shim).
    if (node.method === "element") {
        out.push({ path: `${path}.method`, message: `"element" was renamed to "pageElement" (migrate: scripts/migrate-page-methods.mjs)` })
        return
    }
    if (node.method === "text") {
        out.push({ path: `${path}.method`, message: `"text" was renamed to "pageText" on the pages lane (migrate: scripts/migrate-page-methods.mjs) — a parameters[] text value is unchanged` })
        return
    }
    if (node.method === "pageText") {
        for (const arg of node.args ?? []) {
            if (arg.key !== "value") out.push({ path: `${path}.args.${arg.key}`, message: `unknown "pageText" arg "${arg.key}" — only "value" is allowed` })
        }
        if (node.children?.length) out.push({ path: `${path}.children`, message: `"pageText" nodes cannot have children` })
        return
    }
    if (node.method === "pageView") {
        if (!(node.args ?? []).some(a => a.key === "source")) {
            out.push({ path: `${path}.args`, message: `"pageView" is missing its "source" arg (a views[] key)` })
        }
        for (const arg of node.args ?? []) {
            if (arg.key !== "source") out.push({ path: `${path}.args.${arg.key}`, message: `unknown "pageView" arg "${arg.key}" — only "source" is allowed` })
        }
        if (node.children?.length) out.push({ path: `${path}.children`, message: `"pageView" nodes cannot have children` })
        return
    }
    if (node.method !== "pageElement") {
        out.push({ path: `${path}.method`, message: `unknown page method "${node.method}" — only "pageElement", "pageText" and "pageView" (or a container fragment) are allowed in a page's operations` })
        return
    }
    const args = node.args ?? []
    if (!args.some(a => a.key === "tag")) {
        out.push({ path: `${path}.args`, message: `"pageElement" is missing its "tag" arg` })
    }
    for (const arg of args) {
        const key = arg.key
        if (key === "tag") {
            const ast = tryParseLiteral(arg.input)
            if (ast && !PAGE_TAG_SET.has(String(ast.value))) {
                out.push({ path: `${path}.args.tag`, message: `unknown tag "${ast.value}"` })
            }
            continue
        }
        if (key === "children") continue
        if (key === "style") {
            const ast = tryParseObject(arg.input)
            if (ast) walkStyleAst(ast, `${path}.args.style`, out)
            continue
        }
        if (key === "patches") {
            const ast = tryParseObject(arg.input)
            if (ast) walkPatchesAst(ast, `${path}.args.patches`, out)
            continue
        }
        if (PAGE_EVENT_SET.has(key)) {
            try {
                if (parse(arg.input).type !== "ArrowFunctionExpression") {
                    out.push({ path: `${path}.args.${key}`, message: `event value must be a SINGLE arrow expression like "(e) => ({ count: state.count + 1 })" — no { } statement blocks, no const/return` })
                }
            } catch (error) {
                out.push({ path: `${path}.args.${key}`, message: `${describeParseError(error)} in ${JSON.stringify(arg.input)}` })
            }
            continue
        }
        if (PAGE_ATTRIBUTE_SET.has(key)) continue
        out.push({ path: `${path}.args.${key}`, message: `unknown "pageElement" arg "${key}" — allowed: tag, style, patches, children, or a name from PAGE_ATTRIBUTES/PAGE_EVENTS` })
    }
    for (const [index, child] of (node.children ?? []).entries()) walkPageNode(child, `${path}.children[${index}]`, out)
}

function tryParseLiteral(expr: string): { value: unknown } | null {
    try {
        const ast = parse(expr) as unknown as AstLike
        return ast.type === "Literal" ? (ast as unknown as { value: unknown }) : null
    } catch {
        return null
    }
}

/** Vocabulary + per-arg validation over the whole lane — an unknown method
 *  (not "element"/"text"/a container), an unknown arg key, a bad event
 *  expression, or an unknown static tag/style-property/popover-option each
 *  fail at validate time with their exact path. Plain-value strings are NOT
 *  required to parse (the runtime's literal fallback makes them legal text);
 *  events ARE code and must parse as a single arrow; style/patches are
 *  walked ONLY when they parse as an object literal (unparseable = inert at
 *  runtime, not an error — see the module doc's value-law tolerance). */
export function pageErrors(pages: PageJSON[] | undefined): PageError[] {
    const errors: PageError[] = []
    for (const [pageIndex, page] of (pages ?? []).entries()) {
        const base = `pages[${pageIndex}]`
        page.operations.forEach((node, index) => {
            walkPageNode(node, `${base}.operations[${index}]`, errors)
        })
    }
    return errors
}
