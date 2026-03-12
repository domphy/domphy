import { type PartialElement, type DomphyElement, type StyleObject, type ValueOrState, toState, merge } from "@domphy/core";
import { themeSpacing, themeColor, themeDensity, themeSize, type ThemeColor } from "@domphy/theme";
import { type Placement } from "@floating-ui/dom";
import { tag } from "./tag.js"
import { creatFloating } from "../utils/floating.js"

function selectBox(props: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null | undefined> | number | string | null | undefined>;
    options?: Array<{ label: string, value: string }>;
    placement?: ValueOrState<Placement>;
    content: DomphyElement;
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement) => void;
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

    const wrap: DomphyElement<"div"> = {
        div: (listener) => {
            const val = state.get(listener)
            const vals = Array.isArray(val) ? val : [val]
            const opts = options.filter(opt => vals.includes(opt.value))
            return opts.map(opt => ({
                span: opt.label,
                $: [tag({ color, removable: multiple })],
                _key: opt.value,
                _onRemove: (_node) => {
                    const cur = state.get()
                    const curVals = Array.isArray(cur) ? cur : [cur]
                    const filter = curVals.filter(v => v !== opt.value)
                    multiple ? state.set(filter as any) : state.set(filter[0] as any)
                }
            })) as DomphyElement<"span">[]
        },
        style: {
            display: "flex",
            flexWrap: "wrap",
            gap: themeSpacing(1),
            flex: 1,
        } as StyleObject
    }

    let partial: PartialElement = {
        _onInsert: (node) => {
            if (node.tagName != "div") {
                console.warn(`"selectBox" patch must use div tag`);
            }
        },
        _onInit: (node) => node.children.insert(wrap),
        onClick: () => openState.get() ? hide() : show(),
        style: {
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            minHeight: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            minWidth: themeSpacing(32),
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
        }
    };

    merge(anchorPartial, partial)
    return anchorPartial
}

export { selectBox };
