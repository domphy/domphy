/**
 * Types the live runtime needs from the parked ParaShape engine snapshot.
 * Kept here so @domphy/pages does not import a package that is not in
 * this workspace (@parashape/parametric).
 */

export type Expression = { type: string; [key: string]: unknown }

export type PageArgJSON = { key: string; input: string }

export type OperationJSON = {
    method: string
    key?: string
    args?: PageArgJSON[]
    children?: NodeJSON[]
    enabled?: string
}

export type ContainerJSON = {
    operations: NodeJSON[]
    key?: string
    enabled?: string
}

export type NodeJSON = OperationJSON | ContainerJSON

export type PageJSON = {
    key: string
    title?: string
    parameters?: NodeJSON[]
    operations: NodeJSON[]
}

export type PageScope = {
    params?: Record<string, unknown>
    resolveTable?: (key: string) => unknown
    namespaces?: Record<string, unknown>
    resolveViewSvg?: (key: string) => string | undefined
    extra?: Record<string, unknown>
}

export type ResolvedPagePopover = {
    content?: unknown
    openOn?: "click" | "hover"
    open?: boolean
    placement?: string
    strategy?: "absolute" | "fixed"
    offset?: number
    flip?: boolean
    shift?: boolean
    hide?: boolean
    inline?: boolean
    autoUpdate?: boolean
}
