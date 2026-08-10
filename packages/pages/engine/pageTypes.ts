/**
 * Page resolution value types — pure type declarations.
 * Evaluation lives in pages.ts; DOM adoption in @parashape/pages.
 * Shapes mirror pages.ts's snapshot resolver contract (tagName/events).
 */

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

export type GeneratedPageNode = string | {
    method: string
    key?: string
    args?: { key: string; value: unknown }[]
    children?: GeneratedPageNode[]
}

/** One child of a resolved page tree (no unknown escape hatch).
 *  Primitives come from pageText expression results (value law keeps numbers). */
export type ResolvedPageChild = string | number | boolean | null | ResolvedPageElement | GeneratedPageNode

export type ResolvedPageElement = {
    tagName: string
    key?: string
    /** Nested resolved tree — same union as the page root (no unknown). */
    children?: ResolvedPageChild[]
    attributes?: Record<string, unknown>
    events?: Record<string, (...args: unknown[]) => unknown>
    style?: Record<string, unknown>
    patches?: { popover?: ResolvedPagePopover }
}

export type ResolvedPageValue = {
    title: string
    state: Record<string, unknown>
    children: ResolvedPageChild[]
}

/** Resolved envelope for one pages[] entry. */
export type ResolvedPage = import("./frame.js").Resolved<ResolvedPageValue>
