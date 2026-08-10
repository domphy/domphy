/**
 * popover — the ONE bundled patch (see the pages[] lane's `patches` arg,
 * @parashape/parametric's schema/model.ts module doc + pages.ts's
 * ResolvedPagePopover). Ported from Domphy's own `@domphy/ui` popover.ts +
 * utils/floating.ts (trigger wiring, open-state binding, outside-click/
 * Escape dismiss, content mounting, positioning) with every theme/visual
 * default STRIPPED — no `themeColor`, no `dataTone`; a page author's own
 * `style` arg owns the look. Positioning is backed by the REAL
 * `@floating-ui/dom` npm package, loaded via a literal `import(...)` so a
 * page with no popover loads zero bytes of it. The middleware order is
 * fixed and sane: offset → inline → flip → shift → size → arrow → hide.
 *
 * This file exposes floating-ui's option surface VERBATIM (placement,
 * strategy, offset, flip, shift, arrow, size, hide, inline, autoUpdate) for
 * direct TypeScript callers — @domphy/ui's own popover doesn't need this
 * (it hardcodes `offset(12) + flip() + shift()`). The pages-lane `patches`
 * arg only surfaces the JSON-expressible subset — `arrow`/`size` need a DOM
 * element ref / an `apply` callback, neither of which is JSON data.
 *
 * CROSS-GENERATION STATE (@domphy/core 0.19's per-node `behavior()`
 * contract — see its AGENTS.md "Reused-node lifecycle"): a reactive host
 * (e.g. the builder's live PagesSection preview) re-renders its parent
 * tree, which calls this factory again and produces a BRAND NEW popover()
 * closure — but Domphy PATCHES the same reused ElementNode, it does not
 * recreate it, and lifecycle hooks (_onMount) never re-fire on a reused
 * node. A hand-rolled closure-local `let` for the open/floating state used
 * to orphan on re-render: the document-level dismiss listeners, wired once
 * in whichever generation's _onMount fired first, kept reading THAT
 * generation's own (possibly never-shown) state forever, while a later
 * generation's live-rebound onClick opened a panel those listeners
 * couldn't see (a real bug, fixed once already with a hand-rolled
 * WeakMap<ElementNode, …> before this contract existed — see git history).
 * `behavior()` is the upstream, load-bearing fix for that whole bug class:
 * `attachPopoverFloating` runs ONCE for the real anchor node no matter how
 * many times popover() itself is called, and every later generation's
 * fresh props (openState, content, floating options) route into that SAME
 * instance via `update()` — so whichever generation's handler fires, it
 * always operates on the current truth.
 */
import type {
    BehaviorInstance,
    DomphyElement,
    ElementNode,
    Listener,
    PartialElement,
    State,
    ValueOrState,
} from "@domphy/core"
import { behavior, merge, toState } from "@domphy/core"
import type {
    ArrowOptions,
    AutoUpdateOptions,
    FlipOptions,
    HideOptions,
    InlineOptions,
    Middleware,
    MiddlewareData,
    OffsetOptions,
    Placement,
    ShiftOptions,
    SizeOptions,
    Strategy,
} from "@floating-ui/dom"

export type PopoverOptions = {
    /** Interaction that opens the popover. Default "click". */
    openOn?: "click" | "hover"
    /** Open state, a value or a caller-owned State. Default false. */
    open?: ValueOrState<boolean>
    /** The floating content element to display. */
    content: DomphyElement
    /** Floating placement, value or State. Default "bottom". */
    placement?: ValueOrState<Placement>
    /** CSS position strategy — must match the floating element's own
     *  `position` (this patch sets it). Default "fixed". */
    strategy?: Strategy
    offset?: OffsetOptions
    /** `true`/omitted enables flip() with defaults; `false` disables it. */
    flip?: boolean | FlipOptions
    /** `true`/omitted enables shift() with defaults; `false` disables it. */
    shift?: boolean | ShiftOptions
    /** Needs a DOM ref onto an element ALREADY inside `content` — pass the
     *  SAME object reference used to declare that element in `content`. */
    arrow?: { element: DomphyElement; padding?: ArrowOptions["padding"] }
    size?: SizeOptions
    hide?: boolean | HideOptions
    inline?: boolean | InlineOptions
    /** `false` computes position once and never re-tracks scroll/resize. Default enabled. */
    autoUpdate?: boolean | AutoUpdateOptions
}

function applyArrowStyle(element: HTMLElement, placement: Placement, data?: MiddlewareData["arrow"]): void {
    if (!data) return
    const side = placement.split("-")[0] as "top" | "right" | "bottom" | "left"
    const staticSide = { top: "bottom", right: "left", bottom: "top", left: "right" }[side]
    Object.assign(element.style, {
        position: "absolute",
        left: data.x != null ? `${data.x}px` : "",
        top: data.y != null ? `${data.y}px` : "",
        right: "",
        bottom: "",
        [staticSide]: `${-element.offsetWidth / 2}px`,
    })
}

type FloatingOptions = Pick<PopoverOptions, "offset" | "flip" | "shift" | "arrow" | "size" | "hide" | "inline" | "autoUpdate">

type PopoverFloatingProps = {
    openState: State<boolean>
    placeState: State<Placement>
    content: DomphyElement
    strategy: Strategy
    openOn: "click" | "hover"
    floating: FloatingOptions
}

type PopoverFloatingInstance = BehaviorInstance<PopoverFloatingProps> & {
    show: () => void
    hide: () => void
}

// Mirrors @domphy/ui's utils/floating.ts attachFloating — the per-anchor
// floating-panel mechanics (position, mount, dismiss-from-inside, portal).
// `attach` runs ONCE for the real anchor DOM node; every later popover()
// call on the same reused node routes its fresh props in via update() —
// see the module doc's "CROSS-GENERATION STATE" note.
function attachPopoverFloating(node: ElementNode, initialProps: PopoverFloatingProps): PopoverFloatingInstance {
    let { openState, placeState, content, strategy, openOn, floating: floatingConfig } = initialProps

    let timer: ReturnType<typeof setTimeout> | null = null
    let cleanup: (() => void) | null = null
    let floating: HTMLElement | null = null
    let arrowElement: HTMLElement | null = null
    let floatingNode: ElementNode | null = null
    let mounted = false
    // Independent of openState: floating-ui's hide() middleware flags when
    // the reference itself scrolled out of view — the panel should hide
    // even while still "open" from the user's perspective.
    const hiddenState = toState(false)

    const reference = node.domElement as HTMLElement
    const rootNode = node.getRoot()

    // `arrow.element` is an author-declared node ALREADY inside `content` —
    // wire its _onMount to capture the real DOM ref, composing with
    // whatever hook it already carries (re-run on every generation since a
    // later `content`/`arrow.element` is a fresh object each time).
    const wireArrow = () => {
        if (!floatingConfig.arrow) return
        const arrowTarget = floatingConfig.arrow.element as PartialElement & Record<string, unknown>
        const priorMount = arrowTarget._onMount as ((arrowNode: ElementNode) => void) | undefined
        arrowTarget._onMount = (arrowNode: ElementNode) => {
            arrowElement = arrowNode.domElement as HTMLElement
            priorMount?.(arrowNode)
        }
    }

    const floatingPartial: PartialElement = {
        style: {
            position: strategy,
            pointerEvents: "auto",
            visibility: (listener: Listener) => (openState.get(listener) && !hiddenState.get(listener)) ? "visible" : "hidden",
        },
        // Escape must dismiss the panel from INSIDE it too: the content is
        // portaled as a DOM sibling of the anchor, so a keydown on a
        // focused element within the panel never bubbles to the anchor's
        // own Escape handler.
        onKeyDown: (event) => {
            if ((event as KeyboardEvent).key === "Escape") hide()
        },
        onMouseEnter: () => openOn === "hover" && show(),
        onMouseLeave: () => openOn === "hover" && hide(),
        _onMount: (mountedNode) => {
            floating = mountedNode.domElement as HTMLElement
        },
        _portal: (rootDomNode) => {
            let overlay = rootDomNode.domElement!.querySelector("#parashape-pages-floating")
            if (!overlay) {
                const overlayElement: DomphyElement<"div"> = {
                    div: [],
                    id: "parashape-pages-floating",
                    style: { position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" },
                }
                overlay = (rootDomNode.children!.insert(overlayElement) as ElementNode).domElement!
            }
            return overlay
        },
    }
    // Later generations declare their OWN fresh `content` object — wire it
    // every time (not just at attach), so panel mechanics are present
    // regardless of which generation's content ends up mounted.
    const wireContent = (target: DomphyElement) => merge(target, floatingPartial)
    wireContent(content)
    wireArrow()

    const ensureMounted = () => {
        if (mounted) return
        mounted = true
        floatingNode = rootNode.children!.insert(content) as ElementNode
    }

    const instantShow = () => {
        ensureMounted()
        if (!reference || !floating) return
        cleanup?.()
        const currentFloating = floating
        import("@floating-ui/dom").then((floatingUi) => {
            // Teardown (or a newer instantShow) can run while this async
            // import/computePosition work is in flight.
            if (floating !== currentFloating) return
            // Fixed, sane order: offset → inline → flip → shift → size → arrow → hide.
            const middleware: Middleware[] = []
            if (floatingConfig.offset !== undefined) middleware.push(floatingUi.offset(floatingConfig.offset))
            if (floatingConfig.inline) middleware.push(floatingUi.inline(floatingConfig.inline === true ? undefined : floatingConfig.inline))
            if (floatingConfig.flip !== false) middleware.push(floatingUi.flip(typeof floatingConfig.flip === "object" ? floatingConfig.flip : undefined))
            if (floatingConfig.shift !== false) middleware.push(floatingUi.shift(typeof floatingConfig.shift === "object" ? floatingConfig.shift : undefined))
            if (floatingConfig.size) middleware.push(floatingUi.size(floatingConfig.size))
            if (floatingConfig.arrow && arrowElement) middleware.push(floatingUi.arrow({ element: arrowElement, padding: floatingConfig.arrow.padding }))
            if (floatingConfig.hide) middleware.push(floatingUi.hide(typeof floatingConfig.hide === "object" ? floatingConfig.hide : undefined))

            const update = () => {
                if (!reference || !floating) return
                floatingUi.computePosition(reference, floating, {
                    placement: placeState.get() as Placement,
                    strategy,
                    middleware,
                }).then(({ x, y, placement: resolved, middlewareData }) => {
                    if (!floating) return
                    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
                    placeState.set(resolved)
                    if (arrowElement) applyArrowStyle(arrowElement, resolved, middlewareData.arrow)
                    hiddenState.set(Boolean(middlewareData.hide?.referenceHidden || middlewareData.hide?.escaped))
                })
            }
            if (floatingConfig.autoUpdate === false) {
                update()
            } else {
                cleanup = floatingUi.autoUpdate(reference, floating, update, typeof floatingConfig.autoUpdate === "object" ? floatingConfig.autoUpdate : undefined)
            }
        })
        openState.set(true)
    }
    // Fully unmounts (not just CSS-hides) the panel — a closed floating
    // component holds no DOM/listeners; ensureMounted() re-inserts a fresh
    // panel node next time show() runs.
    const instantHide = () => {
        cleanup?.()
        cleanup = null
        if (floatingNode) {
            floatingNode.remove()
            floatingNode = null
        }
        floating = null
        arrowElement = null
        mounted = false
        openState.set(false)
    }
    // The 100ms delay exists ONLY for hover: it debounces mouseenter/leave
    // transitions so the panel doesn't flicker while the pointer crosses
    // between anchor and panel. A click is a deliberate toggle — respond
    // immediately, a fixed delay there just reads as lag.
    const show = () => {
        if (timer) { clearTimeout(timer); timer = null }
        if (openOn === "hover") timer = setTimeout(instantShow, 100)
        else instantShow()
    }
    const hide = () => {
        if (timer) { clearTimeout(timer); timer = null }
        if (openOn === "hover") timer = setTimeout(instantHide, 100)
        else instantHide()
    }

    const handleOutside = (event: MouseEvent) => {
        if (!openState.get() || !reference || !floating) return
        const target = event.target as Node
        if (!reference.contains(target) && !floating.contains(target)) hide()
    }
    rootNode.domElement?.addEventListener("click", handleOutside)

    return {
        show,
        hide,
        update(props) {
            openState = props.openState
            placeState = props.placeState
            content = props.content
            strategy = props.strategy
            openOn = props.openOn
            floatingConfig = props.floating
            wireContent(content)
            wireArrow()
            // Reflect the new generation's declared content into the
            // already-mounted panel in place (same DOM node, no flicker) —
            // the ordinary reused-node "patch, don't recreate" contract,
            // applied to the imperatively-inserted panel too.
            if (floatingNode) floatingNode.patch(content)
        },
        destroy() {
            if (timer) clearTimeout(timer)
            cleanup?.()
            floatingNode?.remove()
            rootNode.domElement?.removeEventListener("click", handleOutside)
        },
    }
}

/**
 * Floating popover primitive. Attaches to its host as the anchor/trigger and
 * shows a floating `content` element (with `role="dialog"`) on click or
 * hover, positioned via `@floating-ui/dom`. Apply to the trigger element you
 * want the popover anchored to.
 *
 * @example { button: "Open", $: [popover({ openOn: "click", content: { div: "Hi" } })] }
 */
function popover(options: PopoverOptions): PartialElement {
    const { open = false, placement = "bottom", strategy = "fixed", openOn = "click" } = options
    const behaviorKey = "popover"
    const openState = toState(open)
    const placeState = toState(placement)

    // Trigger event handlers ARE live-rebound on every patch and already
    // receive the current ElementNode as their 2nd argument — show(node)/
    // hide(node) just forward to whatever instance is attached there,
    // regardless of which generation's closure is calling.
    const show = (node?: ElementNode) => node?.getBehavior<PopoverFloatingInstance>(behaviorKey)?.show()
    const hide = (node?: ElementNode) => node?.getBehavior<PopoverFloatingInstance>(behaviorKey)?.hide()

    let popoverId: string | null = null
    const popoverPartial: PartialElement = {
        role: "dialog",
        _onInsert: (node) => {
            const id = node.attributes.get("id")
            popoverId = id || node.nodeId
            if (!id) node.attributes.set("id", popoverId)
        },
    }
    options.content.$ ||= []
    options.content.$.push(popoverPartial)

    const anchorPartial: PartialElement = {
        ariaHaspopup: "dialog",
        ariaExpanded: (listener) => openState.get(listener),
        onMouseEnter: (_event, node) => openOn === "hover" && show(node),
        onMouseLeave: (_event, node) => openOn === "hover" && hide(node),
        onClick: (_event, node) => {
            if (openOn !== "click") return
            if (openState.get()) hide(node)
            else show(node)
        },
        onKeyDown: (event, node) => {
            if ((event as KeyboardEvent).key === "Escape" && openState.get()) hide(node)
        },
        onFocus: (_event, node) => openOn === "hover" && show(node),
        onBlur: (event, node) => {
            const related = (event as FocusEvent).relatedTarget as Node | null
            const root = node.getRoot().domElement as Element
            const floatingElement = popoverId ? root.querySelector(`#${CSS.escape(popoverId)}`) : null
            if (related && floatingElement?.contains(related)) return
            hide(node)
        },
        _onMount: (node) => {
            if (popoverId) node.attributes.set("ariaControls", popoverId)
        },
        ...behavior<PopoverFloatingProps>(behaviorKey, attachPopoverFloating, {
            openState,
            placeState,
            content: options.content,
            strategy,
            openOn,
            floating: {
                offset: options.offset,
                flip: options.flip,
                shift: options.shift,
                arrow: options.arrow,
                size: options.size,
                hide: options.hide,
                inline: options.inline,
                autoUpdate: options.autoUpdate,
            },
        }),
    }

    return anchorPartial
}

export { popover }
