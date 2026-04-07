import { ElementNode, State, PartialElement, DomphyElement, toState, ValueOrState, merge } from "@domphy/core";
import { computePosition, autoUpdate, offset, flip, shift, type Placement } from "@floating-ui/dom";

function creatFloating(props: {
    open?: ValueOrState<boolean>;
    placement: State<Placement>;
    content: DomphyElement;
}) {
    const {
        open = false,
        placement,
    } = props;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;
    let reference: HTMLElement | null = null
    let floating: HTMLElement | null = null
    let floatingNode: ElementNode | null = null
    let rootNode: ElementNode | null = null
    let mounted = false
    const openState = toState(open);

    const ensureMounted = () => {
        if (mounted || !rootNode) return
        mounted = true
        floatingNode = rootNode.children!.insert(props.content) as ElementNode
    }

    const instantShow = () => {
        ensureMounted()
        if (reference && floating) {
            cleanup && cleanup();
            cleanup = autoUpdate(reference, floating, () => {
                computePosition(reference as HTMLElement, floating as HTMLElement, {
                    placement: placement.get() as Placement,
                    middleware: [offset(12), flip(), shift()],
                    strategy: "fixed"
                }).then(({ x, y, placement: resolved }) => {
                    Object.assign((floating as HTMLElement).style, { left: `${x}px`, top: `${y}px` });
                    placement.set(resolved)
                });
            });
            openState.set(true)
        }
    };
    const instantHide = () => { cleanup && cleanup(); cleanup = null; openState.set(false) }
    const show = () => { timer && clearTimeout(timer); timer = setTimeout(instantShow, 100) }
    const hide = () => { timer && clearTimeout(timer); timer = setTimeout(instantHide, 100) }

    const floatingPartial: PartialElement = {
        style: {
            position: "fixed",
            pointerEvents: "auto",
            visibility: (listener) => openState.get(listener) ? "visible" : "hidden",
        },
        _onMount: (node) => floating = node.domElement as HTMLElement,
        _portal: (rNode) => {
            let overlay = rNode.domElement!.querySelector(`#domphy-floating`);
            if (!overlay) {
                const overlayEle: DomphyElement<"div"> = {
                    div: [],
                    id: `domphy-floating`,
                    style: { position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" },
                };
                const overlayNode = rNode.children!.insert(overlayEle) as ElementNode;
                overlay = overlayNode.domElement!;
            }
            return overlay;
        },
    };

    merge(props.content, floatingPartial);

    const anchorPartial: PartialElement = {
        onKeyDown: (e) => (e as KeyboardEvent).key === "Escape" && hide(),
        _onMount: (node) => {
            rootNode = node.getRoot()
            reference = node.domElement as HTMLElement

            const handleOutside = (event: MouseEvent) => {
                if (!openState.get() || !reference || !floating) return;
                const target = event.target as Node;
                if (!reference.contains(target) && !floating.contains(target)) {
                    hide()
                }
            }
            node.getRoot().domElement!.addEventListener("click", handleOutside)

            node.addHook("BeforeRemove", () => {
                if (timer) clearTimeout(timer);
                floatingNode && floatingNode.remove();
                node.getRoot().domElement!.removeEventListener("click", handleOutside)
            });
        }
    };

    return { show, hide, anchorPartial };
}

export { creatFloating };
