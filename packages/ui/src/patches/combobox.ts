import { type PartialElement, type DomphyElement, type StyleObject, type ValueOrState, toState, merge } from "@domphy/core";
import { themeSpacing, themeColor, themeDensity, themeSize, type ThemeColor, } from "@domphy/theme";
import { type Placement } from "@floating-ui/dom";
import { tag } from "./tag.js"
import { creatFloating } from "../utils/floating.js"

function combobox(props: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null | undefined> | number | string | null | undefined>;
    options?: Array<{ label: string, value: string }>;
    placement?: ValueOrState<Placement>;
    content: DomphyElement;
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement) => void;
    input?: DomphyElement;
}): PartialElement {
    const {
        options = [],
        placement = "bottom",
        color = "neutral",
        open = false,
        multiple = false
    } = props;

    const state = toState(props.value)
    let openState = toState(open)
    let { show, hide, anchorPartial } = creatFloating({ open: openState, placement, content: props.content, onPlacement: props.onPlacement })

    const popoverPartial: PartialElement = {
        onClick: () => !multiple && hide(),
    };

    merge(props.content, popoverPartial);

    const inputStyle: StyleObject = {
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
        flex: 1,
        height: themeSpacing(6),
        marginInlineStart: themeSpacing(2),
        fontSize: (listener: any) => themeSize(listener, "inherit"),
        color: (listener: any) => themeColor(listener, "shift-9", color),
        backgroundColor: (listener: any) => themeColor(listener, "inherit", color),
    }

    let inputElement: DomphyElement
    if (props.input) {
        merge(props.input, { onFocus: () => show(), style: inputStyle, _key: "combobox-input" })
        inputElement = props.input
    } else {
        inputElement = {
            input: null,
            onFocus: () => show(),
            value: (listener: any) => { state.get(listener); return "" },
            style: inputStyle,
            _key: "combobox-input"
        }
    }

    const wrap: DomphyElement<"div"> = {
        div: (listener) => {
            const val = state.get(listener)
            const vals = Array.isArray(val) ? val : [val]
            const opts = options.filter(opt => vals.includes(opt.value))
            const items: DomphyElement[] = opts.map(opt => {
                return {
                    span: opt.label,
                    $: [tag({ color, removable: true })],
                    _key: opt.value,
                    _onRemove: (_node) => {
                    const cur = state.get()
                    const curVals = Array.isArray(cur) ? cur : [cur]
                    const filter = curVals.filter(v => v !== opt.value)
                    multiple ? state.set(filter as any) : state.set(filter[0] as any)
                }
                }
            })
            items.push(inputElement)
            return items
        },
        style: {
            display: "flex",
            flexWrap: "wrap",
            gap: themeSpacing(1),
        }
    }

    let partial: PartialElement = {
        _onInsert: (node) => {
            if (node.tagName != "div") {
                console.warn(`"combobox" primitive patch must use div tag`);
            }
        },
        _onInit: (node) => node.children.insert(wrap),
        style: {
            minWidth: themeSpacing(32),
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
        }
    };

    merge(anchorPartial, partial)
    return anchorPartial
}

export { combobox };
