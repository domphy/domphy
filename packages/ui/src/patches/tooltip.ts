import { PartialElement, DomphyElement, toState, State, ValueOrState, merge } from "@domphy/core";
import { themeSpacing, themeColor, themeSize } from "@domphy/theme";
import { type Placement } from "@floating-ui/dom";
import { creatFloating } from "../utils/floating.js";
import { popoverArrow } from "./popoverArrow.js";


function tooltip(props: {
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement>;
    content?: DomphyElement | string;
} = {}): PartialElement {
    const {
        open = false,
        placement = "top",
        content = "Tooltip Content"
    } = props;

    let tooltipId: string | null = null
    const placeState = toState(placement);

    let contentElement = typeof content == "string" ? {span:content} : content
    let { show, hide, anchorPartial } = creatFloating({ open, placement, content: contentElement })

    const tooltipPartial: PartialElement = {
        role: "tooltip",
        dataSize: "decrease-1",
        dataTone: "shift-11",
        _onInsert: (node) => {
            let id = node.attributes.get("id")
            tooltipId = id || node.nodeId
            !id && node.attributes.set("id", tooltipId)
        },
        style: {
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(3),
            borderRadius: themeSpacing(2),
            color: (listener) => themeColor(listener, "shift-6"),
            backgroundColor: (listener) => themeColor(listener),
            fontSize: (listener) => themeSize(listener, "inherit"),
        },
        $: [popoverArrow({ placement, bordered: false })]
    };
    contentElement.$ ||=[]
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
