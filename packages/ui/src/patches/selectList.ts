import { PartialElement, DomphyElement, State } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function selectList(props: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null> | number | string | null>;
    color?: ThemeColor;
    name?: string;
} = {}): PartialElement {
    const { color = "neutral", multiple = false } = props;
    const state = toState(props.value ?? (multiple ? [] : null))

    const inputs: DomphyElement<"div"> = {
        div: (listener) => {
            const val = state.get(listener)
            const vals = Array.isArray(val) ? val : [val]
            return vals.map((v) => ({ input: null, name: props.name, value: v || "" }))
        },
        hidden: true,
    }

    let partial: PartialElement = {
        dataTone:"shift-17",
        _context: {
            select: {
                value: state,
                multiple,
            },
        },
        _onInit: (node) => {
            if (node.tagName != "div") {
                console.warn(`"selectList" patch must use a div tag`)
            }
            node.children.insert(inputs)
        },
        style: {
            display: "flex",
            flexDirection: "column",
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
        },
    };
    return partial;
}

export { selectList };
