import { ElementNode, PartialElement, DomphyElement, toState, ValueOrState, merge } from "@domphy/core";
import { computePosition, autoUpdate, offset, flip, shift, type Placement } from "@floating-ui/dom";

function creatFloating(props: {
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement>;
    content: DomphyElement;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement) => void;
}) {
    const {
        open = false,
        placement = "bottom",
    } = props;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;
    let reference: HTMLElement | null = null
    let floating: HTMLElement | null = null
    const openState = toState(open);
    const placeState = toState(placement);
    const computedPlaceState = toState(placeState.get() as Placement);

    const instantShow = () => {
        if (reference && floating) {
            cleanup && cleanup();
            cleanup = autoUpdate(reference, floating, () => {
                computePosition(reference as HTMLElement, floating as HTMLElement, {
                    placement: placeState.get() as Placement,
                    middleware: [offset(12), flip(), shift()],
                    strategy: "fixed"
                }).then(({ x, y, placement: computedPlacement }) => {
                    Object.assign((floating as HTMLElement).style, { left: `${x}px`, top: `${y}px` });
                    computedPlacement !== computedPlaceState.get() && computedPlaceState.set(computedPlacement)
                    props.onPlacement?.(reference!, floating!, computedPlacement)
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

        _portal: (rootNode) => {
            let overlay = rootNode.domElement!.querySelector(`#domphy-floating`);
            if (!overlay) {
                const overlayEle: DomphyElement<"div"> = {
                    div: [],
                    id: `domphy-floating`,
                    style: { position: "fixed", inset: 0, zIndex: 20, pointerEvents: "none" },
                };
                const overlayNode = rootNode.children!.insert(overlayEle) as ElementNode;
                overlay = overlayNode.domElement!;
            }
            return overlay;
        },
    };

    merge(props.content, floatingPartial);

    const anchorPartial: PartialElement = {
        onKeyDown: (e) => (e as KeyboardEvent).key === "Escape" && hide(),
        _onSchedule: (node) => {
            let floatingNode: ElementNode | null = null
            node.getRoot().addHook("Init", (root) => {
                floatingNode = root.children!.insert(props.content) as ElementNode
            })
            node.addHook("BeforeRemove", () => {
                hide();
                if (timer) clearTimeout(timer);
                floatingNode && floatingNode.remove();
            });
        },
        _onMount: (node) => {
            reference = node.domElement as HTMLElement
            const handleOutside = (event: MouseEvent) => {
                if (!openState.get() || !reference || !floating) return;

                const target = event.target as Node;
                if (!reference.contains(target) && !floating.contains(target)) {
                    hide()
                }
            }
            node.getRoot().domElement!.addEventListener("click", handleOutside)
            node.addHook("BeforeRemove", () => node.getRoot().domElement!.removeEventListener("click", handleOutside));
        }
    };

    return { show, hide, anchorPartial, placeState: computedPlaceState };
}

export { creatFloating };
