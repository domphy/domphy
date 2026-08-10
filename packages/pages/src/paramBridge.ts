/**
 * Param → page invalidation bridge. Page expressions read model params
 * through live getters (no notifier of their own), so a host wires THIS:
 * one tick state bumped by every ParameterNode "change", handed to
 * pageElement's `invalidate` — any param edit (panel slider, animation,
 * parashape:setParams) re-runs the page's reactive expressions.
 */
import type { Listener } from "@domphy/core"
import { toState } from "@domphy/core"
import type { Model } from "@parashape/parametric"
import { ParameterNode } from "@parashape/parametric"

export type ParamBridge = {
    invalidate: (listener: Listener) => void
    dispose: () => void
}

export function pageParamBridge(model: Model): ParamBridge {
    const tick = toState(0)
    const bump = () => tick.set(tick.get() + 1)
    // Track one release per subscribed node so a node REMOVED from the
    // collection is unsubscribed (mirror of Renderer's subscribeNodes, which
    // re-subscribes on the collection's "change" — a parameter added while a
    // page preview is mounted must still invalidate the page).
    const releases = new Map<ParameterNode, () => void>()
    const subscribeNodes = () => {
        const current = new Set<ParameterNode>()
        for (const entry of model.nodes.keyedNodes()) {
            if (!(entry.node instanceof ParameterNode)) continue
            current.add(entry.node)
            if (releases.has(entry.node)) continue
            const release = entry.node.addListener("change", bump)
            if (typeof release === "function") releases.set(entry.node, release)
        }
        for (const [node, release] of releases) {
            if (!current.has(node)) { release(); releases.delete(node) }
        }
    }
    subscribeNodes()
    const collectionRelease = model.nodes.addListener("change", subscribeNodes)
    return {
        invalidate: (listener: Listener) => { tick.get(listener) },
        dispose: () => {
            collectionRelease()
            for (const release of releases.values()) release()
            releases.clear()
        },
    }
}
