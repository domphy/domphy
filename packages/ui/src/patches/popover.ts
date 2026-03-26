import { PartialElement, State, DomphyElement, toState, ValueOrState, merge } from "@domphy/core";
import { type Placement } from "@floating-ui/dom";
import { creatFloating } from "../utils/floating.js";

function popover(props: {
    openOn: "click" | "hover";
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement>;
    content: DomphyElement;
}): PartialElement {
    const {
        open = false,
        placement = "bottom",
        openOn = "click"
    } = props;


    let popoverId: string | null = null
    const openState = toState(open);
    const placeState = toState(placement);

    let { show, hide, anchorPartial } = creatFloating({ open: openState, placement: placeState, content: props.content })

    const popoverPartial: PartialElement = {
        role: "dialog",
        dataTone: "shift-17",
        onMouseEnter: () => openOn === "hover" && show(),
        onMouseLeave: () => openOn === "hover" && hide(),
        _onInsert: (node) => {
            let id = node.attributes.get("id")
            popoverId = id || node.nodeId
            !id && node.attributes.set("id", popoverId)
        },
    };

    merge(props.content, popoverPartial);

    const triggerPartial: PartialElement = {
        ariaHaspopup: "dialog",
        ariaExpanded: (listener) => openState.get(listener),
        onMouseEnter: () => openOn === "hover" && show(),
        onMouseLeave: () => openOn === "hover" && hide(),
        onClick: () => {
            if (openOn === "click") {
                if (openState.get()) { hide() } else { show() }
            }
        },
        onFocus: () => show(),
        onBlur: (e, node) => {
            const related = (e as FocusEvent).relatedTarget as Node | null
            const root = node.getRoot().domElement as Element
            const floatingEl = popoverId ? root.querySelector(`#${CSS.escape(popoverId)}`) : null
            if (related && floatingEl?.contains(related)) return
            hide()
        },
        _onMount: (node) => popoverId && node.attributes.set("ariaControls", popoverId)
    };
    merge(anchorPartial, triggerPartial);

    return anchorPartial;
}

export { popover };
