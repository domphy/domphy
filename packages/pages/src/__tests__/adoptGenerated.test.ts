/**
 * adoptGenerated / sanitizeUrl — the generated-subtree sanitizer surface.
 * Generated children bypass save-time pageErrors; these two functions are
 * the only thing standing between a hostile expression result and the DOM.
 */
import { describe, expect, it } from "vitest"
import { adoptGenerated, sanitizeUrl } from "../pageElement.js"

describe("sanitizeUrl", () => {
    it("blocks data:image/svg+xml on href (inline SVG can run script)", () => {
        expect(sanitizeUrl("data:image/svg+xml,<svg onload=alert(1)>", "href")).toBe("#")
        expect(sanitizeUrl("DATA:IMAGE/SVG+XML;base64,PHN2Zz4=", "href")).toBe("#")
        expect(sanitizeUrl("data:\nimage/svg+xml,<svg>", "href")).toBe("#")
    })

    it("blocks any data: URL on href (non-http(s) data)", () => {
        expect(sanitizeUrl("data:image/png;base64,abc", "href")).toBe("#")
        expect(sanitizeUrl("data:text/html,<h1>x</h1>", "href")).toBe("#")
        expect(sanitizeUrl("data:text/javascript,alert(1)", "href")).toBe("#")
    })

    it("allows http(s) and relative href values", () => {
        expect(sanitizeUrl("https://example.com/x", "href")).toBe("https://example.com/x")
        expect(sanitizeUrl("http://example.com/x", "href")).toBe("http://example.com/x")
        expect(sanitizeUrl("/local/path", "href")).toBe("/local/path")
        expect(sanitizeUrl("#section", "href")).toBe("#section")
    })

    it("still blocks javascript: / vbscript: on every URL attribute", () => {
        expect(sanitizeUrl("javascript:alert(1)", "href")).toBe("#")
        expect(sanitizeUrl("java\tscript:alert(1)", "href")).toBe("#")
        expect(sanitizeUrl("vbscript:msgbox(1)", "src")).toBe("#")
    })

    it("allows data:image/* on src (pageView needs svg+xml; rasters stay)", () => {
        expect(sanitizeUrl("data:image/png;base64,abc", "src")).toBe("data:image/png;base64,abc")
        expect(sanitizeUrl("data:image/svg+xml;base64,PHN2Zz4=", "src")).toBe("data:image/svg+xml;base64,PHN2Zz4=")
        expect(sanitizeUrl("data:image/jpeg;base64,abc", "poster")).toBe("data:image/jpeg;base64,abc")
    })

    it("blocks non-image data: on src/poster", () => {
        expect(sanitizeUrl("data:text/html,<h1>x</h1>", "src")).toBe("#")
        expect(sanitizeUrl("data:application/javascript,alert(1)", "poster")).toBe("#")
    })

    it("returns non-strings unchanged", () => {
        expect(sanitizeUrl(undefined, "href")).toBeUndefined()
        expect(sanitizeUrl(3, "href")).toBe(3)
    })
})

describe("adoptGenerated", () => {
    it("drops an object with no method instead of passing the raw tree through", () => {
        const raw = { script: "alert(1)", onClick: () => {}, onerror: "alert(1)" }
        expect(adoptGenerated(raw)).toBeUndefined()
    })

    it("drops an object whose method is missing or not a string", () => {
        expect(adoptGenerated({ method: 1, script: "alert(1)" })).toBeUndefined()
        expect(adoptGenerated({ method: null, div: "x", onClick: () => {} })).toBeUndefined()
        expect(adoptGenerated({ method: { name: "pageElement" }, script: "x" })).toBeUndefined()
    })

    it("unknown object without method must not keep script or on* keys", () => {
        const adopted = adoptGenerated({
            script: "alert(1)",
            onClick: () => {},
            onerror: "alert(1)",
            children: [{ script: "alert(2)" }],
        })
        // Drop, do not wrap: a passthrough would keep script/on* as own keys.
        expect(adopted).toBeUndefined()
        expect(adopted).not.toMatchObject({ script: "alert(1)" })
    })

    it("drops unknown methods entirely", () => {
        expect(adoptGenerated({ method: "evil", args: [] })).toBeUndefined()
        expect(adoptGenerated({ method: "pageView", args: [] })).toBeUndefined()
    })

    it("adopts a well-formed pageElement and pageText", () => {
        expect(adoptGenerated({
            method: "pageElement",
            args: [{ key: "tag", value: "button" }],
            children: ["ok"],
        })).toEqual({ button: ["ok"] })
        expect(adoptGenerated({
            method: "pageText",
            args: [{ key: "value", value: "hello" }],
        })).toBe("hello")
    })

    it("renders an unknown tag as div and skips unknown attributes", () => {
        const adopted = adoptGenerated({
            method: "pageElement",
            args: [
                { key: "tag", value: "script" },
                { key: "onclick", value: "alert(1)" },
                { key: "innerHTML", value: "<img>" },
            ],
        }) as Record<string, unknown>
        expect(adopted).toEqual({ div: null })
        expect(adopted.onclick).toBeUndefined()
        expect(adopted.innerHTML).toBeUndefined()
        expect(adopted.script).toBeUndefined()
    })

    it("filters generated style keys through PAGE_STYLE_PROPERTY_SET", () => {
        const adopted = adoptGenerated({
            method: "pageElement",
            args: [
                { key: "tag", value: "div" },
                {
                    key: "style",
                    value: {
                        color: "red",
                        behavior: "url(xss)",
                        MozBinding: "x",
                        "&:hover": { color: "blue", behavior: "bad" },
                        ".escape": { color: "green" },
                    },
                },
            ],
        }) as { div: unknown; style: Record<string, unknown> }
        expect(adopted.style).toEqual({ color: "red", "&:hover": { color: "blue" } })
        expect(adopted.style.behavior).toBeUndefined()
        expect(adopted.style.MozBinding).toBeUndefined()
        expect(adopted.style[".escape"]).toBeUndefined()
    })

    it("drops a generated style object that has no allowed keys", () => {
        const adopted = adoptGenerated({
            method: "pageElement",
            args: [
                { key: "tag", value: "div" },
                { key: "style", value: { behavior: "url(xss)", expression: "alert(1)" } },
            ],
        }) as Record<string, unknown>
        expect(adopted.style).toBeUndefined()
    })

    it("sanitizes a generated href (no data:image/svg+xml, no data: at all)", () => {
        const svg = adoptGenerated({
            method: "pageElement",
            args: [
                { key: "tag", value: "a" },
                { key: "href", value: "data:image/svg+xml,<svg onload=alert(1)>" },
            ],
        }) as { a: unknown; href: unknown }
        expect(svg.href).toBe("#")
        const png = adoptGenerated({
            method: "pageElement",
            args: [
                { key: "tag", value: "a" },
                { key: "href", value: "data:image/png;base64,abc" },
            ],
        }) as { a: unknown; href: unknown }
        expect(png.href).toBe("#")
    })

    it("keeps primitives; pageText objects are not a raw-tree escape hatch", () => {
        expect(adoptGenerated("hello")).toBe("hello")
        expect(adoptGenerated(3)).toBe(3)
        expect(adoptGenerated(null)).toBe(null)
        expect(adoptGenerated({
            method: "pageText",
            args: [{ key: "value", value: { script: "alert(1)" } }],
        })).toBeUndefined()
    })

    it("adopts arrays and drops unsafe members", () => {
        const adopted = adoptGenerated([
            { script: "alert(1)" },
            { method: "pageText", args: [{ key: "value", value: "safe" }] },
            { method: "evil", args: [] },
        ])
        expect(adopted).toEqual(["safe"])
    })
})
