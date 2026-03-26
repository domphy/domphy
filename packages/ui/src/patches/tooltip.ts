import { PartialElement, type DomphyElement, ValueOrState, merge, toState } from "@domphy/core";
import { themeSpacing, themeColor, themeDensity, themeSize } from "@domphy/theme";
import { type Placement } from "@floating-ui/dom";
import { creatFloating } from "../utils/floating.js";
import { popoverArrow } from "./popoverArrow.js";


function tooltip(props: {
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement>;
    content?: ValueOrState<string>;
} = {}): PartialElement {
    const {
        open = false,
        placement = "top",
        content = "Tooltip Content"
    } = props;

    const placeState = toState(placement)
    const contentState = toState(content)

    let tooltipId: string | null = null

    let contentElement: DomphyElement<"span"> = { span: (listener) => contentState.get(listener) }

    let { show, hide, anchorPartial } = creatFloating({ open, placement: placeState, content: contentElement })

    const tooltipPartial: PartialElement = {
        role: "tooltip",
        dataSize: "decrease-1",
        dataTone: "shift-17",
        _onInsert: (node) => {
            let id = node.attributes.get("id")
            tooltipId = id || node.nodeId
            !id && node.attributes.set("id", tooltipId)
        },
        style: {
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            color: (listener) => themeColor(listener, "shift-9"),
            backgroundColor: (listener) => themeColor(listener),
            fontSize: (listener) => themeSize(listener, "inherit"),
        },
        $: [popoverArrow({ placement: placeState, bordered: false })]
    };
    contentElement.$ ||= []
    contentElement.$.push(tooltipPartial)

    const triggerPartial: PartialElement = {
        onMouseEnter: () => show(),
        onMouseLeave: () => hide(),
        onFocus: () => show(),
        onBlur: () => hide(),
        onKeyDown: (e) => (e as KeyboardEvent).key === "Escape" && hide(),
        _onMount: (node) => tooltipId && node.attributes.set("ariaDescribedby", tooltipId)
    };

    merge(anchorPartial, triggerPartial)

    return anchorPartial;
}

export { tooltip };
