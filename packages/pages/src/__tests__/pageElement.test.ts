/**
 * pageElement (pageElement.ts) — the live Domphy runtime over the pages[]
 * lane (v33: an `element`/`text` NodeJSON tree — see engine/types.ts). Invariants:
 *  1. Expression-valued args render as REACTIVE values: a state.set()
 *     updates exactly the DOM that read that key (fine-grained, RecordState).
 *  2. A declared event arg dispatches through the event law: object return
 *     patches state (and the DOM follows), tuple return fires the host
 *     effect handler.
 *  3. An expression-PRODUCED subtree (a `children` arg's value, GENERATED
 *     NODE shape `{method, args:[{key,value}], children}`) gets its event
 *     functions adopted — a generated button dispatches like a declared one.
 *  4. The VALUE LAW: a string that fails to parse or evaluate renders as
 *     its literal self ("8px", a font stack, plain text) — never a crash.
 *  5. `enabled` conditionally renders a node/subtree, reactively.
 *  6. `style` is ONE object-expression, but each leaf still binds its OWN
 *     reactive value (nested selectors like `&:hover` reach the DOM).
 *  7. Defense-in-depth: a generated subtree with a hostile method/tag is
 *     sanitized (unknown method dropped, unknown tag renders as div).
 *  8. `patches.popover` builds a real popover() patch — trigger aria wiring,
 *     open/dismiss lifecycle, and positioning (mocked @floating-ui/dom —
 *     this suite tests OUR wiring, not floating-ui's own geometry).
 */
// @vitest-environment jsdom

import { ElementNode, flushSync } from "@domphy/core"
import type { NodeJSON, OperationJSON, PageJSON } from "../../engine/index.js"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type PageError, pageElement } from "../pageElement.js"

vi.mock("@floating-ui/dom", () => ({
    computePosition: vi.fn(async () => ({ x: 10, y: 20, placement: "bottom", strategy: "fixed", middlewareData: {} })),
    // Real floating-ui calls `update` immediately on setup, then again on
    // scroll/resize — the mock only needs the immediate call for these tests.
    autoUpdate: vi.fn((_reference: unknown, _floating: unknown, update: () => void) => {
        update()
        return () => {}
    }),
    offset: vi.fn((value: unknown) => ({ name: "offset", value })),
    flip: vi.fn(() => ({ name: "flip" })),
    shift: vi.fn(() => ({ name: "shift" })),
    arrow: vi.fn(() => ({ name: "arrow" })),
    size: vi.fn(() => ({ name: "size" })),
    hide: vi.fn(() => ({ name: "hide" })),
    inline: vi.fn(() => ({ name: "inline" })),
}))

function mount(handle: { element: Record<string, unknown> }): HTMLElement {
    const host = document.createElement("div")
    document.body.appendChild(host)
    new ElementNode(handle.element as never).render(host)
    flushSync()
    return host
}

const scope = { params: { width: 800 } }

// ─── Test-authoring helpers — build the {method, args, children} NodeJSON
// shape (real ModelJSON authoring grammar), same as any hand-written doc. ───

function el(tag: string, options: { args?: Record<string, string>; children?: NodeJSON[]; key?: string } = {}): OperationJSON {
    const node: OperationJSON = {
        method: "pageElement",
        args: [{ key: "tag", input: `'${tag}'` }, ...Object.entries(options.args ?? {}).map(([key, input]) => ({ key, input }))],
    }
    if (options.children) node.children = options.children
    if (options.key) node.key = options.key
    return node
}
function txt(value: string): OperationJSON {
    return { method: "pageText", args: [{ key: "value", input: value }] }
}

describe("pageElement — reactive expressions", () => {
    it("renders expression content and updates when state changes", () => {
        const page: PageJSON = {
            key: "p",
            parameters: [{ key: "quantity", method: "number", args: [{ key: "value", input: "2" }] }],
            operations: [el("span", { children: [txt("'Total: ' + (width * state.quantity)")] })],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        expect(host.textContent).toContain("Total: 1600")
        handle.state.set("quantity", 3)
        flushSync()
        expect(host.textContent).toContain("Total: 2400")
    })

    it("a declared onClick patches state and the DOM follows; a tuple fires the host effect", () => {
        const navigate = vi.fn()
        const page: PageJSON = {
            key: "p",
            parameters: [{ key: "quantity", method: "number", args: [{ key: "value", input: "1" }] }],
            operations: [
                el("span", { children: [txt("'Q=' + state.quantity")] }),
                el("button", { args: { onClick: "(e) => ({ quantity: state.quantity + 1 })" }, children: [txt("Add")] }),
                el("button", { args: { onClick: "(e) => ['navigate', 'checkout']" }, children: [txt("Go")], key: "go" }),
            ],
        }
        const handle = pageElement(page, { scope, effects: { navigate } })
        const host = mount(handle)
        const buttons = host.querySelectorAll("button")
        buttons[0].click()
        flushSync()
        expect(host.textContent).toContain("Q=2")
        buttons[0].click()
        flushSync()
        expect(host.textContent).toContain("Q=3")
        buttons[1].click()
        expect(navigate).toHaveBeenCalledWith("checkout")
    })

    it("an expression-produced subtree adopts its event functions (generated buttons dispatch)", () => {
        const page: PageJSON = {
            key: "p",
            parameters: [
                { key: "picked", method: "text", args: [{ key: "value", input: "''" }] },
                { key: "options", method: "object", args: [{ key: "value", input: "['a','b']" }] },
            ],
            operations: [
                el("span", { children: [txt("'picked: ' + state.picked")] }),
                el("div", {
                    args: {
                        children: "state.options.map(option => ({ method: 'pageElement', args: [{ key: 'tag', value: 'button' }, { key: 'onClick', value: (e) => ({ picked: option }) }], children: [option] }))",
                    },
                }),
            ],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        const buttons = host.querySelectorAll("button")
        expect(buttons).toHaveLength(2)
        buttons[1].click()
        flushSync()
        expect(host.textContent).toContain("picked: b")
    })

    it("the value law: unparsable and uneval-able values render as literal text", () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                // plain text — parses as identifiers, so it falls back literal
                el("p", { children: [txt("Welcome to the store")] }),
                // parses (a string literal), evaluates fine
                el("span", { children: [txt("'ok'")] }),
            ],
        }
        const host = mount(pageElement(page, { scope }))
        expect(host.textContent).toContain("Welcome to the store")
        const span = host.querySelector("span") as HTMLElement
        expect(span.textContent).toBe("ok")
    })

    it("a text node's value falls back to its literal source when it doesn't parse/eval", () => {
        const page: PageJSON = { key: "p", operations: [txt("Plain sentence — includes 8% VAT")] }
        const host = mount(pageElement(page, { scope }))
        expect(host.textContent).toContain("Plain sentence — includes 8% VAT")
    })

    it("an asset (url-method parameter) resolves by bare key; unknown key falls back to the literal", () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("img", { args: { src: "hero", alt: "'missing'" } })],
        }
        // Attached files are ordinary url-method parameters — page expressions
        // reference them by bare key like any other parameter (scope.params).
        const assetScope = { params: { hero: "https://example.com/hero.png" } }
        const host = mount(pageElement(page, { scope: assetScope }))
        const img = host.querySelector("img") as HTMLImageElement
        expect(img.getAttribute("src")).toBe("https://example.com/hero.png")
        expect(img.getAttribute("alt")).toBe("missing")
    })

    it("attributes bind (expression AND literal); title resolves; dispose releases state", () => {
        const page: PageJSON = {
            key: "p",
            title: "'Config ' + width",
            operations: [el("a", { args: { href: "'https://example.com/' + width", target: "_blank" }, children: [txt("Docs")] })],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        const anchor = host.querySelector("a") as HTMLAnchorElement
        expect(anchor.getAttribute("href")).toBe("https://example.com/800")
        // "_blank" parses as an identifier, eval throws → literal fallback
        expect(anchor.getAttribute("target")).toBe("_blank")
        expect(handle.title).toBe("Config 800")
        handle.dispose()
    })

    it("`enabled` conditionally renders a node — falsy hides it, truthy shows it, reactively", () => {
        const page: PageJSON = {
            key: "p",
            parameters: [{ key: "show", method: "boolean", args: [{ key: "value", input: "1" }] }],
            operations: [{ ...el("span", { children: [txt("'Shown'")] }), enabled: "state.show" }],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        expect(host.textContent).toContain("Shown")
        handle.state.set("show", false)
        flushSync()
        expect(host.textContent).not.toContain("Shown")
        handle.state.set("show", true)
        flushSync()
        expect(host.textContent).toContain("Shown")
    })

    it("style is ONE object-expression, but each leaf still binds its own reactive value (&:hover reaches the DOM)", () => {
        const page: PageJSON = {
            key: "p",
            parameters: [{ key: "shade", method: "text", args: [{ key: "value", input: "'rgb(1, 2, 3)'" }] }],
            operations: [el("button", {
                args: { style: "{ color: state.shade, '&:hover': { color: 'rgb(4, 5, 6)' } }" },
                children: [txt("Hover me")],
            })],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        const button = host.querySelector("button") as HTMLElement
        expect(getComputedStyle(button).color).toBe("rgb(1, 2, 3)")
        const sheetText = Array.from(document.styleSheets)
            .map(sheet => { try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n") } catch { return "" } })
            .join("\n")
        expect(sheetText).toContain(":hover")
        expect(sheetText).toContain("rgb(4, 5, 6)")
    })

    it("a generated subtree drops a hostile method and renders an unknown tag as div (defense-in-depth)", () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("div", {
                args: {
                    children: "[{ method: 'pageElement', args: [{ key: 'tag', value: 'script' }] }, { method: 'evil', args: [] }, { method: 'pageText', args: [{ key: 'value', value: 'safe' }] }]",
                },
            })],
        }
        const host = mount(pageElement(page, { scope }))
        expect(host.querySelector("script")).toBeNull()
        expect(host.textContent).toContain("safe")
    })

    it("a generated raw object without method is dropped (no script/on* passthrough)", () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("div", {
                args: {
                    children: "[{ script: 'alert(1)', onClick: () => {} }, { method: 'pageText', args: [{ key: 'value', value: 'safe' }] }]",
                },
            })],
        }
        const host = mount(pageElement(page, { scope }))
        expect(host.querySelector("script")).toBeNull()
        expect(host.textContent).toContain("safe")
        expect(host.querySelector("[onclick]")).toBeNull()
    })
})

// Real timers, not fake ones: the show/hide debounce races a REAL dynamic
// `import("@floating-ui/dom")` + its own async `.then()` chain, and fake
// timers only reliably drain microtasks tied to a faked timer tick — a real
// short wait is simpler and robust regardless of how many promise hops the
// module loader needs.
const settle = () => new Promise(resolve => setTimeout(resolve, 200))

describe("pageElement — patches.popover", () => {
    afterEach(() => { document.body.innerHTML = "" })

    it("wires trigger aria attributes and mounts the panel content on open", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("button", {
                args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Popover body' }] }] } }" },
                children: [txt("Info")],
            })],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement
        expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
        expect(host.querySelector("#parashape-pages-floating")).toBeNull()

        trigger.click()
        await settle()
        flushSync()

        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        const overlay = host.querySelector("#parashape-pages-floating") as HTMLElement
        expect(overlay).not.toBeNull()
        expect(overlay.textContent).toContain("Popover body")
        const panel = overlay.querySelector('[role="dialog"]') as HTMLElement
        // left/top are set via a direct DOM mutation (position, not Domphy's
        // CSS-in-JS); visibility is a DECLARED reactive style property, which
        // Domphy applies through a generated class rule, not an inline style.
        expect(panel.style.left).toBe("10px")
        expect(panel.style.top).toBe("20px")
        expect(getComputedStyle(panel).visibility).toBe("visible")
    })

    it("click opens and closes IMMEDIATELY — the 100ms debounce is hover-only", () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("button", {
                args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }] } }" },
                children: [txt("Info")],
            })],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement

        // No settle() wait: openState flips synchronously on click.
        trigger.click()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        trigger.click()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
    })

    it("hover keeps the 100ms debounce (no flicker while the pointer crosses)", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("button", {
                args: { patches: "{ popover: { openOn: 'hover', content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }] } }" },
                children: [txt("Info")],
            })],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement

        trigger.dispatchEvent(new MouseEvent("mouseenter"))
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")

        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
    })

    it("dismisses on a second click and on Escape", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("button", {
                args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }] } }" },
                children: [txt("Info")],
            })],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement

        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")

        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
    })

    it("dismisses on an outside click", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                el("button", {
                    args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }] } }" },
                    children: [txt("Info")],
                }),
                el("span", { children: [txt("outside")] }),
            ],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement
        const outside = host.querySelector("span") as HTMLElement

        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        outside.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
    })

    it("a children-expression can generate a popover patch too (patches are plain data, not a whitelisted call)", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("div", {
                args: {
                    children: "[{ method: 'pageElement', args: [{ key: 'tag', value: 'button' }, { key: 'patches', value: { popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Generated body' }] }] } } }], children: ['Info'] }]",
                },
            })],
        }
        const host = mount(pageElement(page, { scope }))
        const trigger = host.querySelector("button") as HTMLButtonElement
        expect(trigger.getAttribute("aria-haspopup")).toBe("dialog")
        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")
        expect(host.querySelector("#parashape-pages-floating")?.textContent).toContain("Generated body")
    })

    it("REGRESSION: outside-click and Escape still dismiss after a parent re-render produces a fresh popover() closure on the reused trigger node", async () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                el("button", {
                    args: { patches: "{ popover: { content: [{ method: 'pageText', args: [{ key: 'value', value: 'Body' }] }] } }" },
                    children: [txt("Info")],
                }),
                el("span", { children: [txt("outside")] }),
            ],
        }
        const host = document.createElement("div")
        document.body.appendChild(host)
        const rootNode = new ElementNode(pageElement(page, { scope }).element as never)
        rootNode.render(host)
        flushSync()

        // Simulate the builder's live PagesSection preview re-rendering its
        // reactive parent (accordion open, unrelated builder state churn): a
        // SECOND pageElement() call builds a brand-new popover() closure,
        // then patch() reconciles it onto the SAME DOM nodes (reused, per
        // Domphy's reused-node lifecycle — _onMount does NOT re-fire on the
        // trigger, only its live-rebound event handlers get replaced).
        rootNode.patch(pageElement(page, { scope }).element as never)
        flushSync()

        const trigger = host.querySelector("button") as HTMLButtonElement
        const outside = host.querySelector("span") as HTMLElement

        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        outside.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")

        // Re-open, then dismiss via Escape on the trigger itself.
        trigger.click()
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("true")

        trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        await settle()
        flushSync()
        expect(trigger.getAttribute("aria-expanded")).toBe("false")
    })
})


describe("pageElement — onError channel", () => {
    afterEach(() => { document.body.innerHTML = "" })

    it("reports an event compile failure and a missing effect handler through onError", () => {
        const errors: PageError[] = []
        const page: PageJSON = {
            key: "p",
            operations: [
                el("button", { args: { onClick: "(e) => {" }, children: [txt("Broken")] }),
                el("button", { args: { onClick: "(e) => ['navigate', 'checkout']" }, children: [txt("Go")] }),
            ],
        }
        pageElement(page, { scope, onError: error => errors.push(error) })
        // The broken event fails at BUILD time (compile-once), before mount.
        expect(errors).toHaveLength(1)
        expect(errors[0].kind).toBe("event-compile")
        expect(errors[0].name).toBe("onClick")
        expect(errors[0].error).toBeDefined()

        const host = mount(pageElement(page, { scope, onError: error => errors.push(error) }))
        const go = host.querySelectorAll("button")[1] as HTMLButtonElement
        go.click()
        const missing = errors.find(error => error.kind === "missing-effect")
        expect(missing).toBeDefined()
        expect(missing?.name).toBe("navigate")
    })

    it("without onError, the legacy console.warn path still fires", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const page: PageJSON = {
            key: "p",
            operations: [el("button", { args: { onClick: "(e) => ['navigate', 'checkout']" }, children: [txt("Go")] })],
        }
        const host = mount(pageElement(page, { scope }))
        ;(host.querySelector("button") as HTMLButtonElement).click()
        expect(warn).toHaveBeenCalledWith('[page] no handler for effect "navigate"')
        warn.mockRestore()
    })
})


describe("pageElement — nodePathAttr (editor node identity)", () => {
    it("stamps every declared node with its operations-root index path", () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                el("div", {
                    children: [
                        txt("'hello'"),
                        el("span", { children: [txt("'world'")] }),
                    ],
                }),
                el("button", { children: [txt("'Go'")] }),
            ],
        }
        const handle = pageElement(page, { scope, nodePathAttr: "data-np" })
        const host = mount(handle)
        const stamped = (path: string) => host.querySelector(`[data-np="${path}"]`)
        expect(stamped("0")?.tagName).toBe("DIV")
        expect(stamped("0.0")?.tagName).toBe("SPAN") // pageText wraps in a span
        expect(stamped("0.0")?.textContent).toBe("hello")
        expect(stamped("0.1")?.tagName).toBe("SPAN")
        expect(stamped("0.1.0")?.textContent).toBe("world")
        expect(stamped("1")?.tagName).toBe("BUTTON")
        expect(stamped("1.0")?.textContent).toBe("Go")
    })

    it("containers are transparent: the path chain descends through their operations", () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                { operations: [el("div", { children: [txt("'a'")] })] } as unknown as NodeJSON,
                txt("'b'"),
            ],
        }
        const handle = pageElement(page, { scope, nodePathAttr: "data-np" })
        const host = mount(handle)
        expect(host.querySelector('[data-np="0.0"]')?.tagName).toBe("DIV")
        expect(host.querySelector('[data-np="0.0.0"]')?.textContent).toBe("a")
        expect(host.querySelector('[data-np="1"]')?.textContent).toBe("b")
    })

    it("a generated subtree (children-arg expression) is never stamped", () => {
        const page: PageJSON = {
            key: "p",
            operations: [
                el("ul", {
                    args: {
                        children:
                            "[{ method: 'pageElement', args: [{ key: 'tag', value: 'li' }], children: [{ method: 'pageText', args: [{ key: 'value', value: 'item' }] }] }]",
                    },
                }),
            ],
        }
        const handle = pageElement(page, { scope, nodePathAttr: "data-np" })
        const host = mount(handle)
        expect(host.querySelector("li")?.textContent).toBe("item")
        const stamped = host.querySelectorAll("[data-np]")
        expect(stamped.length).toBe(1) // only the declared <ul>
        expect(stamped[0].tagName).toBe("UL")
    })

    it("without the option, output is unchanged (no attribute, bare text runs)", () => {
        const page: PageJSON = {
            key: "p",
            operations: [el("div", { children: [txt("'hello'")] })],
        }
        const handle = pageElement(page, { scope })
        const host = mount(handle)
        expect(host.querySelector("[data-np]")).toBeNull()
        expect(host.querySelector("div span")).toBeNull()
        expect(host.textContent).toBe("hello")
    })
})
