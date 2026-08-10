/**
 * pages[] lane — interactive screen UI riding the model (pages.ts, v33: an
 * `element`/`text` NodeJSON tree). Invariants from the spec:
 *  1. A page's content is `operations: NodeJSON[]` — `element` (args: `tag`
 *     required, one arg per PAGE_ATTRIBUTES/PAGE_EVENTS name, `style`/
 *     `patches` each ONE object-expression, `children` a dynamic-subtree
 *     expression) or `text` (arg: `value`), or a container fragment. `key`
 *     stays raw (reconcile identity, never evaluated); `enabled` gates a
 *     node out of resolution entirely.
 *  2. VALUE LAW: attribute/tag/text-value args, `title`, and a page
 *     parameter's own default expression are expression-first with LITERAL
 *     FALLBACK — "8px" and "'8px'" both work, "'W = ' + width"
 *     interpolates, a plain sentence is itself. `style`/`patches` are each
 *     ONE such value but must parse as a whole object to do anything.
 *  3. Pages are PARAMETRIC: a model param edit changes the next resolve
 *     through the live getter-backed scope — no scope rebuild.
 *  4. `parameters` (node-shaped, VALUE methods only — same lane law as
 *     ComponentJSON/TextureJSON) seed the page's initial `state`, evaluated
 *     in the HOST-VISIBLE page scope (unlike an isolated component/pattern
 *     parameter, a page parameter's default may read model params/Table.get).
 *  5. Events are CODE: the value must be a single arrow expression; its
 *     return drives the runtime per the event law — object = state patch,
 *     tuple = effect, array of tuples = several effects
 *     (interpretEventResult is the one interpreter).
 *  6. Loops/conditionals need no grammar: a `children` ARG expression
 *     produces GENERATED node arrays (`{method, args:[{key,value}],
 *     children}` — resolved data, passed through untouched by the headless
 *     resolver).
 *  7. validateModelJSON rejects a doc carrying any pageErrors, and the zod
 *     layer rejects an unknown top-level field (`operations` must be an
 *     array; a stray `children` field is unrecognized).
 */
import { describe, expect, it } from "vitest"
import { Model } from "../Model.js"
import { interpretEventResult, pageErrors, resolvePage, type ResolvedPageElement } from "../pages.js"
import type { ModelJSON, PageJSON } from "../schema/model.js"
import type { NodeJSON, OperationJSON } from "../schema/model.js"
import { validateModelJSON } from "../validate.js"
import { registry } from "./testRegistry.js"

// One `json`-method parameter node — the free-shape escape hatch for a
// non-numeric/text initial value (arrays/objects). Shared by the tests below
// so a page's `parameters` entry reads the same shorthand as `widthParam`.
const jsonParam = (key: string, value: string) => ({ key, method: "object", args: [{ key: "value", input: value }] })

// Test-authoring helpers — build the {method, args, children} NodeJSON shape
// (real ModelJSON authoring grammar), same as any hand-written doc.
function el(tag: string, options: { args?: Record<string, string>; children?: NodeJSON[]; key?: string } = {}): OperationJSON {
    const node: OperationJSON = {
        method: "pageElement",
        args: [{ key: "tag", input: `'${tag}'` }, ...Object.entries(options.args ?? {}).map(([key, input]) => ({ key, input }))] }
    if (options.children) node.children = options.children
    if (options.key) node.key = options.key
    return node
}
function txt(value: string): OperationJSON {
    return { method: "pageText", args: [{ key: "value", input: value }] }
}

const doc = (pages: PageJSON[], parameters: object[] = []): ModelJSON => ({
    title: "t",
    parameters: parameters as ModelJSON["parameters"],
    pages } as ModelJSON)

const widthParam = { method: "length", key: "width", args: [{ key: "value", input: "800" }] }

describe("resolvePage — per-slot laws over params + state", () => {
    it("evaluates values, keeps `key` raw; style is ONE object-expression whose leaves may be quoted strings or bare numbers", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            title: "'Price list ' + width",
            parameters: [{ key: "quantity", method: "number", args: [{ key: "value", input: "2" }] }],
            operations: [el("div", {
                            key: "widthDouble", // raw — an identity, not an expression (NodeJSON.key is still identifier-shaped)
                            args: { style: "{ gap: '8px', padding: 8, flexGrow: 1 }" },
                            children: [txt("'W = ' + (width * state.quantity)"), txt("Price includes VAT")] })] }], [widthParam]), { registry })
        const page = model.evaluatePage("home")
        expect(page.value.title).toBe("Price list 800")
        const child = page.value.children[0] as ResolvedPageElement
        expect(child.tagName).toBe("div")
        expect(child.key).toBe("widthDouble")
        expect((child.children as unknown[])[0]).toBe("W = 1600")
        // plain sentence: parse fails → literal
        expect((child.children as unknown[])[1]).toBe("Price includes VAT")
        expect(child.style?.gap).toBe("8px")
        expect(child.style?.padding).toBe(8)
        expect(child.style?.flexGrow).toBe(1)
    })

    it("is PARAMETRIC: a param edit changes the next resolve through the live scope", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            operations: [el("span", { children: [txt("width")] })] }], [widthParam]), { registry })
        expect(((model.evaluatePage("home").value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(800)
        const param = (model.nodes.getMapKey() as unknown as Record<string, { setInput: (v: string) => void }>).width
        param.setInput("1000")
        model.nodes.evaluate()
        expect(((model.evaluatePage("home").value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(1000)
    })

    it("a parameter's default reads a host model param; a stateOverride wins", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            parameters: [{ key: "quantity", method: "number", args: [{ key: "value", input: "width / 400" }] }],
            operations: [el("span", { children: [txt("state.quantity")] })] }], [widthParam]), { registry })
        expect(model.evaluatePage("home").value.state.quantity).toBe(2)
        expect(model.evaluatePage("home", { quantity: 7 }).value.state.quantity).toBe(7)
        expect(((model.evaluatePage("home", { quantity: 7 }).value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(7)
    })

    it("the `json` value method seeds a free-shape (array/object) initial value", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            parameters: [
                jsonParam("options", "['a','b','c']"),
                jsonParam("cart", "{ items: [], total: 0 }"),
            ],
            operations: [el("span", { children: [txt("state.options.length + state.cart.total")] })] }]), { registry })
        const page = model.evaluatePage("home")
        expect(page.value.state.options).toEqual(["a", "b", "c"])
        expect(page.value.state.cart).toEqual({ items: [], total: 0 })
        expect(((page.value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(3)
    })

    it("Table.get works inside a page expression", () => {
        const json = doc([{
            key: "home",
            operations: [el("span", { children: [txt("Table.get('doors').rows.length")] })] }])
        json.objects = [{
            key: "openings",
            operations: [
                { method: "rectangle", args: [{ key: "point1", input: "[0,0,0]" }, { key: "point2", input: "[100,100,0]" }] },
                { method: "applyAttribute", args: [{ key: "key", input: "'kind'" }, { key: "value", input: "'door'" }] },
            ] }] as ModelJSON["objects"]
        json.tables = [{
            key: "doors",
            operations: [{ method: "tableSource", args: [
                { key: "entities", input: "openings" },
                { key: "type", input: "['door']" },
                { key: "fields", input: "['kind']" },
            ] }] }]
        const model = Model.fromJSON(json, { registry })
        expect(((model.evaluatePage("home").value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(1)
    })

    it("a page expression reads an attached file's url by bare parameter key (no Image.url global)", () => {
        const json = doc([{
            key: "home",
            operations: [
                el("span", { children: [txt("hero")] }),
                el("img", { args: { src: "hero" } }),
            ] }], [{ method: "url", key: "hero", args: [{ key: "value", input: "'https://example.com/hero.png'" }] }])
        const model = Model.fromJSON(json, { registry })
        const page = model.evaluatePage("home")
        expect(((page.value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe("https://example.com/hero.png")
        expect((page.value.children[1] as ResolvedPageElement).attributes?.src).toBe("https://example.com/hero.png")
    })

    it("loops and conditionals live in `children` ARG expressions — .map produces generated node arrays", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            parameters: [
                { key: "open", method: "boolean", args: [{ key: "value", input: "1" }] },
                jsonParam("items", "['a','b','c']"),
            ],
            operations: [
                el("div", { args: { children: "state.items.map(item => ({ method: 'pageElement', args: [{ key: 'tag', value: 'p' }], children: [item] }))" } }),
                el("div", { args: { children: "state.open ? [{ method: 'pageElement', args: [{ key: 'tag', value: 'span' }], children: ['shown'] }] : []" } }),
            ] }]), { registry })
        const page = model.evaluatePage("home")
        const list = (page.value.children[0] as ResolvedPageElement).children as Array<{ children: unknown[] }>
        expect(list.map(item => item.children[0])).toEqual(["a", "b", "c"])
        expect(((page.value.children[1] as ResolvedPageElement).children as unknown[]).length).toBe(1)
        const closed = model.evaluatePage("home", { open: 0, items: [] })
        expect(((closed.value.children[1] as ResolvedPageElement).children as unknown[]).length).toBe(0)
    })

    it("Color/Format namespaces resolve; attributes evaluate with literal fallback", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            operations: [el("a", {
                args: { href: "'/m/' + width", target: "_blank", style: "{ color: Color.darken('#ff0000', 0.5) }" },
                children: [txt("Format.currency(1200, 'USD', 'en-US')")] })] }], [widthParam]), { registry })
        const child = model.evaluatePage("home").value.children[0] as ResolvedPageElement
        expect((child.children as unknown[])[0]).toBe("$1,200.00")
        expect(child.style?.color).toBe("#800000")
        expect(child.attributes?.href).toBe("/m/800")
        expect(child.attributes?.target).toBe("_blank")
    })

    it("`enabled` gates a node out of resolution entirely — falsy contributes nothing", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            parameters: [{ key: "show", method: "boolean", args: [{ key: "value", input: "1" }] }],
            operations: [
                { ...el("span", { children: [txt("'Shown'")] }), enabled: "state.show" },
                el("span", { children: [txt("'Always'")] }),
            ] }]), { registry })
        expect(model.evaluatePage("home").value.children).toHaveLength(2)
        expect(model.evaluatePage("home", { show: 0 }).value.children).toHaveLength(1)
    })

    it("patches.popover: the WHOLE config (incl. content) is ONE object-expression, evaluated once", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            operations: [el("button", {
                args: {
                    patches: "{ popover: { content: [{ method: 'pageElement', args: [{ key: 'tag', value: 'div' }], children: ['W = ' + width, 'Plain text'] }], openOn: 'hover', placement: 'top-start', offset: 12, flip: false } }" },
                children: [txt("Info")] })] }], [widthParam]), { registry })
        const button = model.evaluatePage("home").value.children[0] as ResolvedPageElement
        const popover = button.patches?.popover
        expect(popover?.openOn).toBe("hover")
        expect(popover?.placement).toBe("top-start")
        expect(popover?.offset).toBe(12)
        expect(popover?.flip).toBe(false)
        const contentChild = (popover?.content as Array<{ children: unknown[] }>)[0]
        expect(contentChild.children[0]).toBe("W = 800")
        expect(contentChild.children[1]).toBe("Plain text")
    })
})

describe("event law — arrow value resolves to a function; its return is interpreted", () => {
    it("object return = state patch; tuple = effect; array of tuples = several effects", () => {
        const model = Model.fromJSON(doc([{
            key: "home",
            parameters: [{ key: "quantity", method: "number", args: [{ key: "value", input: "1" }] }],
            operations: [el("button", {
                args: {
                    onClick: "(e) => ({ quantity: state.quantity + 1 })",
                    onDblClick: "(e) => ['navigate', 'checkout']",
                    onKeyDown: "(e) => [['setParam', 'width', 1200], ['navigate', 'done']]" },
                children: [txt("Add")] })] }]), { registry })
        const page = model.evaluatePage("home")
        const events = (page.value.children[0] as ResolvedPageElement).events as Record<string, (e: unknown) => unknown>
        expect(typeof events.onClick).toBe("function")

        const patch = interpretEventResult(events.onClick({}))
        expect(patch.patch).toEqual({ quantity: 2 })
        expect(patch.effects).toEqual([])

        const single = interpretEventResult(events.onDblClick({}))
        expect(single.effects).toEqual([{ action: "navigate", args: ["checkout"] }])

        const multiple = interpretEventResult(events.onKeyDown({}))
        expect(multiple.effects).toEqual([
            { action: "setParam", args: ["width", 1200] },
            { action: "navigate", args: ["done"] },
        ])
        // fail-soft shapes
        expect(interpretEventResult(undefined)).toEqual({ effects: [] })
        expect(interpretEventResult(42)).toEqual({ effects: [] })
    })
})

describe("validation — closed vocabulary, per-arg laws", () => {
    const pageWith = (node: object): PageJSON[] => [{ key: "p", operations: [node as NodeJSON] }]

    it("an unknown tag / attribute-like arg / event-like arg / CSS property each fail with their path", () => {
        expect(pageErrors(pageWith(el("marquee")))[0]).toMatchObject({ path: "pages[0].operations[0].args.tag" })
        expect(pageErrors(pageWith(el("div", { args: { onload: "x" } })))[0])
            .toMatchObject({ path: "pages[0].operations[0].args.onload" })
        expect(pageErrors(pageWith(el("div", { args: { onScroll: "(e) => ({})" } })))[0])
            .toMatchObject({ path: "pages[0].operations[0].args.onScroll" })
        expect(pageErrors(pageWith(el("div", { args: { style: "{ colour: 'red' }" } })))[0])
            .toMatchObject({ path: "pages[0].operations[0].args.style.colour" })
    })

    it("an unknown page method is named — only element/text (or a container) are allowed", () => {
        const errors = pageErrors(pageWith({ method: "docText", args: [] }))
        expect(errors[0].path).toBe("pages[0].operations[0].method")
        expect(errors[0].message).toContain("unknown page method")
    })

    it("events must be SINGLE arrow expressions — block bodies and non-arrows fail", () => {
        const block = pageErrors(pageWith(el("button", { args: { onClick: "() => { const a = 1; return { a }; }" } })))
        expect(block[0].path).toBe("pages[0].operations[0].args.onClick")
        const notArrow = pageErrors(pageWith(el("button", { args: { onClick: "state.count + 1" } })))
        expect(notArrow[0].message).toContain("arrow")
    })

    it("nested style rules: '&…'/@media/@keyframes recurse with the same property whitelist; anything else fails", () => {
        expect(pageErrors(pageWith(el("div", {
            args: { style: "{ '&:hover': { backgroundColor: '#eee' }, '@media (max-width: 600px)': { display: 'none' } }" } })))).toEqual([])
        expect(pageErrors(pageWith(el("div", { args: { style: "{ '&:hover': { colour: 'red' } }" } })))[0].path)
            .toBe("pages[0].operations[0].args.style.&:hover.colour")
        expect(pageErrors(pageWith(el("div", { args: { style: "{ '.child': { color: 'red' } }" } })))[0].message)
            .toContain("nested style key")
        const keyframes = pageErrors(pageWith(el("div", {
            args: { style: "{ '@keyframes pulse': { from: { opacity: 0 }, '50%': { opacity: 0.5 }, sideways: { opacity: 1 } } }" } })))
        expect(keyframes).toHaveLength(1)
        expect(keyframes[0].path).toContain("sideways")
    })

    it("plain-value strings are LEGAL (literal fallback) — no parse requirement outside events; style/patches need only parse as an object", () => {
        expect(pageErrors(pageWith(el("p", {
            args: { style: "{ width: '100%', fontFamily: 'Segoe UI, Tahoma, sans-serif' }", target: "_blank" },
            children: [txt("Plain sentence — includes 8% VAT")] })))).toEqual([])
    })

    it("patches option keys are validated statically when parseable; content itself is generated data (not statically checked)", () => {
        expect(pageErrors(pageWith(el("button", { args: { patches: "{ tooltip: {} }" } })))[0])
            .toMatchObject({ path: "pages[0].operations[0].args.patches.tooltip" })
        expect(pageErrors(pageWith(el("button", { args: { patches: "{ popover: { openOn: 'never' } }" } })))[0])
            .toMatchObject({ path: "pages[0].operations[0].args.patches.popover.openOn" })
        expect(pageErrors(pageWith(el("button", { args: { patches: "{ popover: { content: [{ method: 'script' }] } }" } })))).toEqual([])
    })

    it("validateModelJSON rejects a doc with a page error and accepts a clean one; zod kills unrecognized fields", () => {
        expect(() => validateModelJSON(doc([{ key: "bad", operations: [el("div", { args: { style: "{ colour: 'x' }" } })] }]), registry))
            .toThrow(/pages\[0\]/)
        expect(() => validateModelJSON(doc([{ key: "bad", operations: [{ method: "pageElement", args: [{ key: "tag", input: "'div'" }], children: "not-an-array" } as never] }]), registry))
            .toThrow()
        expect(() => validateModelJSON(doc([{ key: "ok", operations: [el("div", { children: [txt("hello")] })] }]), registry))
            .not.toThrow()
    })

    it("duplicate page keys are rejected by the schema", () => {
        expect(() => validateModelJSON(doc([
            { key: "a", operations: [el("div", { children: [txt("x")] })] },
            { key: "a", operations: [el("div", { children: [txt("y")] })] },
        ]), registry)).toThrow(/duplicate page key/)
    })
})

describe("round-trip", () => {
    it("toJSON preserves the pages lane, including `parameters`/`operations`, verbatim", () => {
        const pages: PageJSON[] = [{
            key: "home",
            parameters: [
                { key: "n", method: "number", args: [{ key: "value", input: "1" }] },
                jsonParam("items", "['a','b']"),
            ],
            operations: [el("div", { children: [txt("hi")] })] }]
        const model = Model.fromJSON(doc(pages), { registry })
        expect(model.toJSON().pages).toEqual(pages)
    })

    it("toJSON preserves a `patches` arg verbatim", () => {
        const pages: PageJSON[] = [{
            key: "home",
            operations: [el("button", {
                args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }], openOn: 'hover' } }" },
                children: [txt("Info")] })] }]
        const model = Model.fromJSON(doc(pages), { registry })
        expect(model.toJSON().pages).toEqual(pages)
    })
})

describe("resolvePage standalone (no Model) — the PageScope contract", () => {
    it("works with a bare scope object", () => {
        const page: PageJSON = { key: "p", operations: [el("span", { children: [txt("price * 2")] })] }
        const resolved = resolvePage(page, { params: { price: 21 } })
        expect(((resolved.value.children[0] as ResolvedPageElement).children as unknown[])[0]).toBe(42)
    })
})

describe("pageView — a page shows a drawing THROUGH a view (references.ts pages→views)", () => {
    const viewNode = (source: string): NodeJSON => ({ method: "pageView", args: [{ key: "source", input: source }] })

    it("resolves to an <img> whose src is the view's SVG as a data URI; an unresolvable key renders nothing", () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>`
        const page: PageJSON = { key: "p", operations: [viewNode("'plan'"), viewNode("'missing'")] }
        const resolved = resolvePage(page, { resolveViewSvg: key => (key === "plan" ? svg : undefined) })
        expect(resolved.value.children).toHaveLength(1)
        const img = resolved.value.children[0] as ResolvedPageElement
        expect(img.tagName).toBe("img")
        expect(img.attributes?.alt).toBe("plan")
        const src = String(img.attributes?.src)
        expect(src.startsWith("data:image/svg+xml;base64,")).toBe(true)
        expect(Buffer.from(src.slice("data:image/svg+xml;base64,".length), "base64").toString("utf-8")).toBe(svg)
    })

    it("source is expression-capable (state/params reach it) and a page with no view hook renders nothing", () => {
        const page: PageJSON = {
            key: "p",
            parameters: [jsonParam("chosen", "'plan'")],
            operations: [viewNode("state.chosen")],
        }
        const seen: string[] = []
        resolvePage(page, { resolveViewSvg: key => { seen.push(key); return undefined } })
        expect(seen).toEqual(["plan"])
        const bare = resolvePage(page, {})
        expect(bare.value.children).toHaveLength(0)
    })

    it("pageErrors accepts pageView, requires source, rejects other args and children", () => {
        const ok: PageJSON = { key: "p", operations: [viewNode("'plan'")] }
        expect(pageErrors([ok])).toEqual([])
        const bad: PageJSON = { key: "p", operations: [
            { method: "pageView", args: [{ key: "scale", input: "2" }], children: [txt("'x'")] },
        ] }
        const messages = pageErrors([bad]).map(e => e.message)
        expect(messages.some(m => m.includes(`missing its "source"`))).toBe(true)
        expect(messages.some(m => m.includes(`unknown "pageView" arg "scale"`))).toBe(true)
        expect(messages.some(m => m.includes("cannot have children"))).toBe(true)
    })

    it("through a real Model: pageView pulls the views[] chain and renders its entities", () => {
        const model = Model.fromJSON({
            title: "t",
            parameters: [widthParam],
            objects: [{ key: "body", operations: [{ method: "rectangle", key: "profile", args: [{ key: "point1", input: "[0, 0]" }, { key: "point2", input: "[width, 200]" }] }] }],
            views: [{ key: "plan", operations: [{ method: "viewPlan", args: [] }] }],
            pages: [{ key: "home", operations: [viewNode("'plan'")] }],
        } as unknown as ModelJSON, { registry })
        const resolved = model.evaluatePage("home")
        const img = resolved.value.children[0] as ResolvedPageElement
        expect(img?.tagName).toBe("img")
        const src = String(img.attributes?.src)
        const body = Buffer.from(src.slice("data:image/svg+xml;base64,".length), "base64").toString("utf-8")
        expect(body.includes("<svg")).toBe(true)
        expect(body.includes("<path")).toBe(true)
    })
})
