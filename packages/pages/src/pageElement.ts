/**
 * pages[] lane — the LIVE Domphy runtime. The engine side (parse, evaluate,
 * event law, validation) lives in @parashape/parametric's pages.ts; this
 * module bridges a page's `element`/`text` NodeJSON tree (v33, 2026-07-22 —
 * see schema/model.ts's module doc) onto Domphy's fine-grained reactivity:
 *
 *   pageElement(page, options) → { element, state, dispose }
 *
 * `element` is an ordinary Domphy element object — embed it anywhere in a
 * host tree ({ div: [handle.element] }); no separate mount API. Every arg
 * value compiles ONCE (jsep AST) and evaluates inside a Domphy reactive
 * function `(l) => …` whose `state` reads register the listener on a
 * per-key RecordState — so a state.set touches exactly the DOM that read
 * that key, no tree diffing.
 *
 * Depends on @domphy/core ONLY (no @domphy/ui, no @domphy/theme) — a page
 * author's own `style` arg owns the look. The one exception is `patches`
 * (this package's own popover.ts, lazy @floating-ui/dom).
 *
 * ARG GRAMMAR (an `element` node's `args` — see pages.ts's module doc for
 * the full grammar): `tag` (resolved ONCE, non-reactive — a Domphy element's
 * tag is structural, it can't swap live), one arg PER attribute/event (each
 * independently reactive, same fine-grained law every other arg gets),
 * `style` (ONE object-expression — parsed once into an AST, then each LEAF
 * property gets its OWN reactive binding off its own AST sub-node, so a
 * single CSS property's dependency doesn't re-run the whole object),
 * `patches` (ONE object-expression, resolved ONCE like `tag` — content is
 * generated data that can't be incrementally re-bound leaf-by-leaf, same
 * trade-off popover config always had), `children` (an expression producing
 * a DYNAMIC subtree, reactive). A `text` node's `value` arg is reactive.
 * Static children ride the node's own `children` FIELD.
 *
 * VALUE LAW (attribute/tag/text-value args, `title` — pages.ts is the SSOT):
 * expression-first, literal fallback — a string that fails to parse OR
 * evaluate IS the literal value ("8px", "'W = ' + width", a font stack, all
 * just work). Events are code: no fallback. `style`/`patches` fall back to
 * INERT (no style/patches applied) rather than a literal — an object-shaped
 * value has no sensible "string" fallback.
 *
 * Event law (pages.ts is the SSOT): an event value is an arrow expression;
 * its call-time RETURN is interpreted by interpretEventResult — object =
 * state patch (RecordState.set per key), tuples = effects dispatched to
 * options.effects[action].
 *
 * GENERATED NODES (pages.ts's module doc: `{method, key?, args?:
 * {key,value}[], children?}`, or a bare string for text shorthand) are what
 * a `children`/`patches.popover.content` expression PRODUCES — already-
 * resolved data (real values, real functions for event args), not further
 * expression strings. adoptGenerated translates them to Domphy recursively
 * so a generated button dispatches exactly like a declared one; ALL
 * defense-in-depth sanitization stays (safeTag on the tag value → unknown
 * tag renders as div, attribute whitelist skip, sanitizeUrl on href/src/
 * poster, unknown method dropped).
 */
import type { Listener, RecordState as RecordStateType } from "@domphy/core"
import { RecordState } from "@domphy/core"
import {
    createTableNamespace,
    type Expression,
    encodeBase64,
    evaluate,
    interpretEventResult,
    isContainerJSON,
    type NodeJSON,
    type OperationJSON,
    PAGE_ATTRIBUTE_SET,
    PAGE_EVENT_SET,
    PAGE_PATCH_SET,
    PAGE_TAG_SET,
    type PageJSON,
    type PageScope,
    parse,
    type ResolvedPagePopover,
    resolvePageParameters,
    StatsNamespace,
} from "@parashape/parametric"
import { type PopoverOptions, popover } from "./popover.js"

// Defense-in-depth: children/patches EXPRESSIONS generate node-shaped data at
// runtime, which save-time pageErrors can't validate — a generated
// `{method: 'pageElement', args:[{key:'tag', value:'script'}]}` or an unknown
// attribute name would otherwise become a real, executing DOM element/
// handler. Anything outside the closed page vocabulary is dropped: an
// unknown tag renders as a neutral div, an unknown attribute/method is skipped.
const safeTag = (tag: string): string => (PAGE_TAG_SET.has(tag) ? tag : "div")

// URL-valued attributes: a whitelisted NAME (href/src/poster) still carries a
// dangerous VALUE — `href="javascript:…"` runs on click. Neutralize the
// executable/document schemes (keep data:image for inline images).
const URL_ATTRIBUTES = new Set(["href", "src", "poster"])
function sanitizeUrl(value: unknown): unknown {
    if (typeof value !== "string") return value
    // Drop every ASCII control char + space (code <= 0x20) BEFORE the scheme
    // check. The browser's URL parser strips embedded tab/newline/CR and leading
    // C0 controls (incl. NUL, which JS .trim() leaves) before resolving the
    // scheme, so `java<TAB>script:` and a NUL-prefixed scheme are live to it. We
    // test the stripped form but return the ORIGINAL value when safe, so a legit
    // URL with an incidental space stays untouched.
    let stripped = ""
    for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) > 0x20) stripped += value[i]
    const s = stripped.toLowerCase()
    if (s.startsWith("javascript:") || s.startsWith("vbscript:") || (s.startsWith("data:") && !s.startsWith("data:image/"))) return "#"
    return value
}

export type PageEffects = Record<string, (...args: unknown[]) => void>

/** A structured runtime error from the page lane: expression/event compile
 *  failures, effects with no registered handler, popover patch build
 *  failures. Surfaced through PageElementOptions.onError — without that
 *  option the same information goes to console.warn/error (legacy path). */
export type PageError = {
    /** Machine-readable category. */
    kind: "missing-effect" | "event-compile" | "popover-patch"
    /** Human-readable message (the same text the console fallback logs). */
    message: string
    /** The effect action or event name involved, when applicable. */
    name?: string
    /** The underlying caught error, when one exists. */
    error?: unknown
}

export type PageHandle = {
    /** Domphy element — embed in any host tree. */
    element: Record<string, unknown>
    /** The page's live state (per-key reactive). */
    state: RecordStateType
    /** Resolved page title (static snapshot at build). */
    title: string
    dispose: () => void
}

export type PageElementOptions = {
    /** Model-side expression scope — `Model.pageScope()`. */
    scope: PageScope
    /** Host effect vocabulary: navigate/setParam/… (see pages.ts event law). */
    effects?: PageEffects
    /** Extra names visible to page expressions, merged over the defaults. */
    extra?: Record<string, unknown>
    /** External invalidation bridge: called with the Domphy listener on every
     *  reactive evaluation — a host reads its own tick state here so a model
     *  PARAM change re-runs page expressions (param getters are live but have
     *  no notifier of their own; the host owns the subscription). */
    invalidate?: (listener: Listener) => void
    /** Opt-in NODE IDENTITY for editor hosts (the builder's visual page
     *  editor): stamp this attribute (e.g. "data-np") on every DECLARED
     *  node's rendered element with its PATH — the index chain from the
     *  page's operations root ("0.2.1"), the exact addressing
     *  PageTreeEditor's listAt uses (containers are transparent: the chain
     *  descends through their `operations`). A `pageText` — normally a bare
     *  text run — wraps in an inline <span> so it carries the attribute;
     *  `pageView`'s <img> and every `pageElement` stamp directly. GENERATED
     *  subtrees (a `children`-arg expression's output) are never stamped —
     *  they have no declared node to address. Hosts that never edit can
     *  ignore this option: output is byte-identical without it. */
    nodePathAttr?: string
    /** Structured runtime error channel (see PageError). Omit it to keep the
     *  current console.warn/error behavior — a configurator host passes this
     *  to surface page authoring errors in its own UI instead of the console. */
    onError?: (error: PageError) => void
}

function buildScope(
    scope: PageScope,
    extra: Record<string, unknown> | undefined,
    record: RecordStateType,
    invalidate?: (listener: Listener) => void,
) {
    const base: Record<string, unknown> = { ...scope.extra, ...extra }
    // Same namespaces the headless resolver builds (pages.ts's buildContext) —
    // the live runtime and the snapshot must see one expression surface, so
    // both take Table.* from the shared factory instead of re-deriving `get`.
    if (scope.resolveTable) {
        const resolveTable = scope.resolveTable
        base.Table = createTableNamespace(resolveTable)
    }
    base.Stats = StatsNamespace
    // `state` is listener-aware: reads inside a reactive function register the
    // Domphy listener per KEY; reads inside an event handler (no listener)
    // just snapshot the current value.
    const stateFor = (listener?: Listener) => new Proxy({} as Record<string, unknown>, {
        get: (_, key) => (typeof key === "string" ? record.get(key, listener) : undefined),
        has: () => true,
    })
    return {
        context(listener?: Listener): Record<string, unknown> {
            const context: Record<string, unknown> = {}
            // Params are getter-backed on scope.params (live pulls) — copy the
            // getters through so each expression read pulls fresh. The host's
            // invalidate hook subscribes this listener to param changes.
            if (listener && invalidate) invalidate(listener)
            for (const key of Object.keys(scope.params ?? {})) {
                Object.defineProperty(context, key, {
                    get: () => (scope.params as Record<string, unknown>)[key],
                    enumerable: true,
                })
            }
            Object.assign(context, base)
            context.state = stateFor(listener)
            return context
        },
        namespaces: scope.namespaces,
    }
}

// Build the real popover() Domphy patch from a resolved config — `content`
// is already adopted Domphy content (adoptGenerated'd by the caller),
// everything else is a plain literal passed straight through.
function makePopoverPatch(content: unknown, config: Omit<ResolvedPagePopover, "content">): unknown {
    return popover({
        content: { div: content } as PopoverOptions["content"],
        openOn: config.openOn,
        open: config.open,
        placement: config.placement as PopoverOptions["placement"],
        strategy: config.strategy,
        offset: config.offset,
        flip: config.flip,
        shift: config.shift,
        hide: config.hide,
        inline: config.inline,
        autoUpdate: config.autoUpdate,
    })
}

function argInput(node: OperationJSON, key: string): string | undefined {
    return node.args?.find(a => a.key === key)?.input
}

// jsep's Expression type is intentionally loose — the same duck-typed
// access pattern pages.ts's own pageErrors uses for style/patches.
type AstLike = { type: string; [key: string]: unknown }

function objectEntries(ast: AstLike): { key: string; value: AstLike }[] {
    const properties = (ast.properties as { key: AstLike; value: AstLike }[] | undefined) ?? []
    return properties.map(p => ({
        key: p.key.type === "Identifier" ? String(p.key.name) : String((p.key as unknown as { value: unknown }).value),
        value: p.value,
    }))
}

const ELEMENT_META_ARGS = new Set(["tag", "style", "patches", "children"])

export function pageElement(page: PageJSON, options: PageElementOptions): PageHandle {
    const record = new RecordState<Record<string, unknown>>({})
    const scope = buildScope(options.scope, options.extra, record, options.invalidate)

    // Single funnel for runtime errors: onError when the host provides one,
    // otherwise the legacy console path (warn for missing effect handlers,
    // error for compile/patch failures).
    const reportError = (error: PageError): void => {
        if (options.onError) {
            options.onError(error)
            return
        }
        if (error.kind === "missing-effect") console.warn(error.message)
        else console.error(error.message, error.error)
    }

    const evaluateExpression = (expression: string, listener?: Listener): unknown =>
        evaluate(parse(expression), scope.context(listener), scope.namespaces)

    // Parameter defaults seed the initial state once at build (they may read
    // params/Table.get — the SAME headless resolver pages.ts's own
    // resolvePage uses, so the live runtime and the snapshot resolve can
    // never diverge). The value law applies: a string that isn't an
    // expression is itself.
    for (const [key, value] of Object.entries(resolvePageParameters(page.parameters, options.scope))) {
        record.set(key, value)
    }

    const dispatch = (result: unknown): void => {
        const outcome = interpretEventResult(result)
        if (outcome.patch) {
            for (const [key, value] of Object.entries(outcome.patch)) record.set(key, value)
        }
        for (const effect of outcome.effects) {
            const handler = options.effects?.[effect.action]
            if (handler) handler(...effect.args)
            else reportError({ kind: "missing-effect", name: effect.action, message: `[page] no handler for effect "${effect.action}"` })
        }
    }

    // Adopt a GENERATED node (the resolved value of a `children`/patches-
    // content expression) into Domphy content: `{method: 'pageElement', args,
    // children}` becomes a Domphy element, `{method:'text', args}`/a bare
    // string becomes text, an unrecognized method is dropped entirely.
    const adoptGenerated = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(adoptGenerated).filter(item => item !== undefined)
        if (!value || typeof value !== "object" || typeof (value as { method?: unknown }).method !== "string") return value
        const node = value as { method: string; key?: string; args?: { key: string; value: unknown }[]; children?: unknown[] }
        const byKey = new Map((node.args ?? []).map(a => [a.key, a.value]))
        if (node.method === "pageText") return byKey.get("value") ?? ""
        if (node.method !== "pageElement") return undefined
        const out: Record<string, unknown> = {}
        const tag = safeTag(String(byKey.get("tag") ?? "div"))
        out[tag] = node.children !== undefined ? adoptGenerated(node.children) : null
        if (typeof node.key === "string") out._key = node.key
        for (const [key, val] of byKey) {
            if (ELEMENT_META_ARGS.has(key)) continue
            if (PAGE_EVENT_SET.has(key) && typeof val === "function") {
                const fn = val as (...args: unknown[]) => unknown
                out[key] = (...args: unknown[]) => dispatch(fn(...args))
            } else if (PAGE_ATTRIBUTE_SET.has(key)) {
                out[key] = URL_ATTRIBUTES.has(key) ? sanitizeUrl(val) : val
            }
        }
        const styleValue = byKey.get("style")
        if (styleValue && typeof styleValue === "object") out.style = styleValue
        const patchesValue = byKey.get("patches") as Record<string, unknown> | undefined
        const popoverValue = patchesValue?.popover as Record<string, unknown> | undefined
        if (popoverValue) {
            const { content, ...rest } = popoverValue
            try {
                out.$ = [makePopoverPatch(adoptGenerated(content), rest as Omit<ResolvedPagePopover, "content">)]
            } catch (error) {
                reportError({ kind: "popover-patch", message: "[page] generated popover patch failed:", error })
            }
        }
        return out
    }

    // The VALUE law, compiled once: unparsable string = static literal;
    // parsable = reactive fn whose eval failure falls back to the literal
    // per evaluation. Successful results are adopted (a children/patches
    // expression may produce generated node subtrees).
    const reactiveValue = (expression: string): unknown => {
        let ast: ReturnType<typeof parse>
        try {
            ast = parse(expression)
        } catch {
            return expression
        }
        return (listener: Listener) => {
            try {
                return adoptGenerated(evaluate(ast, scope.context(listener), scope.namespaces))
            } catch {
                return expression
            }
        }
    }

    // A ONE-SHOT value-law eval (no reactivity) — for args resolved exactly
    // once at build time: `tag` (structural, can't swap live) and `patches`
    // (generated content can't be incrementally re-bound leaf-by-leaf).
    const evaluateValueOnce = (expression: string): unknown => {
        try {
            return evaluateExpression(expression)
        } catch {
            return expression
        }
    }

    // Events are CODE: compile the arrow once; its body reads live state at
    // call time. A broken event reports (onError/console) and renders without
    // a handler.
    const eventHandler = (name: string, expression: string): unknown => {
        let arrow: unknown
        try {
            arrow = evaluateExpression(expression)
        } catch (error) {
            reportError({ kind: "event-compile", name, message: `[page] event "${name}" failed to compile:`, error })
            return undefined
        }
        if (typeof arrow !== "function") return undefined
        const handler = arrow as (...args: unknown[]) => unknown
        return (...args: unknown[]) => dispatch(handler(...args))
    }

    // `style` arg → a plain nested object where each LEAF is its OWN reactive
    // binding, evaluated directly off its own AST sub-node (no re-stringify/
    // re-parse) — true per-property fine-grained reactivity even though the
    // whole style is authored as ONE object-expression. Falls back to an
    // EMPTY object when the expression doesn't parse as one (inert, per the
    // value-law tolerance — see pages.ts's module doc).
    const buildStyleLeaf = (leaf: AstLike) => (listener: Listener) => {
        try {
            return evaluate(leaf as unknown as Expression, scope.context(listener), scope.namespaces)
        } catch {
            return undefined
        }
    }
    const buildStyleObject = (ast: AstLike): Record<string, unknown> => {
        const out: Record<string, unknown> = {}
        for (const { key, value } of objectEntries(ast)) {
            out[key] = value.type === "ObjectExpression" ? buildStyleObject(value) : buildStyleLeaf(value)
        }
        return out
    }
    const buildStyleArg = (expression: string): Record<string, unknown> => {
        let ast: AstLike
        try {
            ast = parse(expression) as unknown as AstLike
        } catch {
            return {}
        }
        return ast.type === "ObjectExpression" ? buildStyleObject(ast) : {}
    }

    // `patches` arg → resolved ONCE (see the module doc's trade-off note);
    // `content` is adopted through the SAME adoptGenerated machinery as a
    // `children` expression's dynamic output.
    const buildPatchesArg = (expression: string): unknown[] => {
        const value = evaluateValueOnce(expression)
        if (!value || typeof value !== "object") return []
        const popoverConfig = (value as Record<string, unknown>).popover
        if (!popoverConfig || typeof popoverConfig !== "object" || !PAGE_PATCH_SET.has("popover")) return []
        const { content, ...rest } = popoverConfig as Record<string, unknown>
        try {
            return [makePopoverPatch(adoptGenerated(content), rest as Omit<ResolvedPagePopover, "content">)]
        } catch (error) {
            reportError({ kind: "popover-patch", message: "[page] popover patch failed:", error })
            return []
        }
    }

    // XSS-safe via @domphy/core escape-by-default (2026-07-26).
    const buildTextValue = (node: OperationJSON, path: number[]): unknown => {
        const valueInput = argInput(node, "value")
        const value = valueInput !== undefined ? reactiveValue(valueInput) : ""
        // Editor identity (see PageElementOptions.nodePathAttr): a text run
        // has no element to address, so edit mode wraps it in an inline span.
        if (options.nodePathAttr) return { span: value, [options.nodePathAttr]: path.join(".") }
        return value
    }

    // A pageView renders ONCE at build (structural, like `tag`/`patches`):
    // the resolved SVG is a snapshot, not a reactive binding — a model edit
    // reaches it through the host's ordinary page re-mount, same as the
    // headless resolver. Mirrors pages.ts's resolveNodeList branch exactly.
    const buildViewImage = (node: OperationJSON, path: number[]): unknown => {
        const sourceInput = argInput(node, "source")
        const key = sourceInput === undefined ? "" : String(evaluateValueOnce(sourceInput) ?? "")
        const svg = key ? options.scope.resolveViewSvg?.(key) : undefined
        if (svg === undefined) return ""
        const out: Record<string, unknown> = { img: null, src: `data:image/svg+xml;base64,${encodeBase64(svg)}`, alt: key }
        if (options.nodePathAttr) out[options.nodePathAttr] = path.join(".")
        return out
    }

    const buildElementChildren = (node: OperationJSON, path: number[]): unknown => {
        const childrenInput = argInput(node, "children")
        if (childrenInput !== undefined) return reactiveValue(childrenInput)
        if (node.children?.length) return buildNodeList(node.children, path)
        return null
    }

    const buildElementNode = (node: OperationJSON, path: number[]): Record<string, unknown> => {
        const out: Record<string, unknown> = {}
        const tagInput = argInput(node, "tag")
        const tag = safeTag(tagInput !== undefined ? String(evaluateValueOnce(tagInput) ?? "div") : "div")
        out[tag] = buildElementChildren(node, path)
        if (node.key !== undefined) out._key = node.key
        if (options.nodePathAttr) out[options.nodePathAttr] = path.join(".")
        for (const arg of node.args ?? []) {
            const key = arg.key
            if (ELEMENT_META_ARGS.has(key)) continue
            if (PAGE_EVENT_SET.has(key)) {
                const handler = eventHandler(key, arg.input)
                if (handler) out[key] = handler
                continue
            }
            if (!PAGE_ATTRIBUTE_SET.has(key)) continue
            const resolved = reactiveValue(arg.input)
            out[key] = URL_ATTRIBUTES.has(key)
                ? (typeof resolved === "function"
                    ? (listener: Listener) => sanitizeUrl((resolved as (l: Listener) => unknown)(listener))
                    : sanitizeUrl(resolved))
                : resolved
        }
        const styleInput = argInput(node, "style")
        if (styleInput !== undefined) out.style = buildStyleArg(styleInput)
        const patchesInput = argInput(node, "patches")
        if (patchesInput !== undefined) {
            const patches = buildPatchesArg(patchesInput)
            if (patches.length) out.$ = patches
        }
        return out
    }

    // Whether a value evaluated on every reactive tick — `state`/`config`
    // dependency change — must gate a node/subtree OUT entirely. Composes
    // with any ancestor container's own guard (an AND chain).
    const enabledCheck = (expression: string): ((listener: Listener) => boolean) => {
        const value = reactiveValue(expression)
        return (listener: Listener) => Boolean(typeof value === "function" ? (value as (l: Listener) => unknown)(listener) : value)
    }
    const gateItem = (built: unknown, guards: string[]): ((listener: Listener) => unknown) => {
        const checks = guards.map(enabledCheck)
        return (listener: Listener) => {
            for (const check of checks) if (!check(listener)) return null
            return typeof built === "function" ? (built as (l: Listener) => unknown)(listener) : built
        }
    }

    // Flat item list for a NodeJSON list (a page's root `operations`, or an
    // element's own static `children` field) — SAME recursive rule pages.ts's
    // headless resolveNodeList uses (container = transparent fragment
    // splicing its own list in; `enabled` composes down as an AND-guard on
    // every descendant it gates).
    const buildNodeItems = (nodes: NodeJSON[], enabledGuards: string[], pathPrefix: number[]): unknown[] => {
        const items: unknown[] = []
        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index]
            const path = [...pathPrefix, index]
            const guards = node.enabled !== undefined ? [...enabledGuards, node.enabled] : enabledGuards
            if (isContainerJSON(node)) {
                // A container is a transparent fragment: its items splice into
                // THIS list — and the path chain descends through its
                // `operations` the same way listAt's childListOf does.
                items.push(...buildNodeItems(node.operations, guards, path))
                continue
            }
            const built = node.method === "pageText" ? buildTextValue(node, path)
                : node.method === "pageView" ? buildViewImage(node, path)
                : buildElementNode(node, path)
            items.push(guards.length ? gateItem(built, guards) : built)
        }
        return items
    }

    // Domphy array ITEMS aren't individually reactive — one dynamic item
    // (an `enabled` guard, a text/children expression) makes the WHOLE list
    // a single reactive function; static siblings keep their identity via
    // closure (ported from the pre-v33 buildChildren's own doc).
    const buildNodeList = (nodes: NodeJSON[], pathPrefix: number[] = []): unknown => {
        const items = buildNodeItems(nodes, [], pathPrefix)
        if (!items.some(item => typeof item === "function")) return items
        return (listener: Listener) =>
            items.map(item => (typeof item === "function" ? (item as (l: Listener) => unknown)(listener) : item))
    }

    let title = page.key
    if (page.title) {
        try {
            title = String(evaluateExpression(page.title) ?? page.key)
        } catch {
            title = page.title
        }
    }

    return {
        element: { div: buildNodeList(page.operations) },
        state: record,
        title,
        dispose: () => record._dispose(),
    }
}
