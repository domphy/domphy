/**
 * pageParamBridge (paramBridge.ts) — the param→page invalidation bridge.
 * Invariants:
 *  1. A parameter that already exists at bridge construction invalidates the
 *     page on value change (the original behavior).
 *  2. A ParameterNode added AFTER bridge construction is picked up: the
 *     bridge listens on the node collection's "change" and subscribes new
 *     ParameterNodes (mirrors Renderer.subscribeNodes) — a param created
 *     while a page preview is mounted must still re-run the page.
 *  3. A ParameterNode REMOVED from the collection is unsubscribed — its
 *     edits no longer invalidate the page.
 */

import { flushSync, type Listener } from "@domphy/core"
import { Model, ParameterNode } from "../../engine/index.js"
import { describe, expect, it, vi } from "vitest"
import { pageParamBridge } from "../paramBridge.js"

// Domphy's Listener carries element metadata; the bridge only needs the call.
const listenerOf = (fn: () => void) => fn as unknown as Listener

describe("pageParamBridge", () => {
    it("invalidates on change of a parameter added AFTER bridge construction", () => {
        const model = new Model("bridge-late-add")
        const bridge = pageParamBridge(model)
        const listener = vi.fn()
        bridge.invalidate(listenerOf(listener))
        listener.mockClear()

        // Late add: the bridge must subscribe this node via the collection's
        // "change" event, then a value edit must bump the invalidation tick.
        const param = new ParameterNode("width", "number", "800")
        model.nodes.add(param)
        param.setInput("1200")
        model.evaluate()
        flushSync()
        expect(listener).toHaveBeenCalled()
        bridge.dispose()
    })

    it("a removed parameter no longer invalidates; dispose releases everything", () => {
        const model = new Model("bridge-remove")
        const param = new ParameterNode("depth", "number", "500")
        model.nodes.add(param)

        const bridge = pageParamBridge(model)
        const listener = vi.fn()
        bridge.invalidate(listenerOf(listener))
        listener.mockClear()

        model.nodes.remove(param)
        param.setInput("600")
        model.evaluate()
        flushSync()
        expect(listener).not.toHaveBeenCalled()

        // After dispose, even a live parameter must not reach the listener.
        const other = new ParameterNode("height", "number", "900")
        model.nodes.add(other)
        listener.mockClear()
        bridge.dispose()
        other.setInput("1000")
        model.evaluate()
        flushSync()
        expect(listener).not.toHaveBeenCalled()
    })
})
