/**
 * Headless page helpers the live runtime used to import from
 * @parashape/parametric. Copied/adapted from engine/pages.ts so the parked
 * package is self-contained.
 */
import { evaluate, parse } from "./expression.js"
import type { ContainerJSON, NodeJSON, OperationJSON, PageScope } from "./types.js"

export function isContainerJSON(node: NodeJSON): node is ContainerJSON {
    return Array.isArray((node as ContainerJSON).operations) && typeof (node as OperationJSON).method !== "string"
}

export function encodeBase64(text: string): string {
    if (typeof Buffer !== "undefined") return Buffer.from(text, "utf8").toString("base64")
    return btoa(unescape(encodeURIComponent(text)))
}

export function createTableNamespace(resolveTable: (key: string) => unknown): { get: (key: string) => unknown } {
    return { get: resolveTable }
}

export const StatsNamespace = {
    count: (rows: unknown[]) => rows.length,
}

export type PageEffect = { action: string; args: unknown[] }
export type EventOutcome = { patch?: Record<string, unknown>; effects: PageEffect[] }

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

export function resolvePageParameters(parameters: NodeJSON[] | undefined, scope: PageScope): Record<string, unknown> {
    const state: Record<string, unknown> = {}
    const context: Record<string, unknown> = { ...(scope.params ?? {}), ...(scope.extra ?? {}) }
    if (scope.resolveTable) context.Table = createTableNamespace(scope.resolveTable)
    context.Stats = StatsNamespace
    for (const node of parameters ?? []) {
        if (isContainerJSON(node) || !node.key) continue
        const operation = node as OperationJSON
        const primary = operation.args?.find(arg => arg.key === "value")
        if (!primary || !operation.key) continue
        try {
            state[operation.key] = evaluate(parse(primary.input), context, scope.namespaces)
        } catch {
            state[operation.key] = primary.input
        }
    }
    return state
}
