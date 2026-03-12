import { type PartialElement, merge, toState, type ValueOrState } from "@domphy/core";
import { themeSpacing, themeColor, themeSize, type ThemeColor } from "@domphy/theme";

function toggleGroup(props: {
    value?: ValueOrState<string | string[]>;
    multiple?: boolean;
    color?: ThemeColor;
} = {}): PartialElement {
    const { multiple = false, color = "neutral" } = props;
    return {
        role: "group",
        dataTone: "shift-2",
        _context: {
            toggleGroup: {
                value: toState(props.value ?? (multiple ? [] : "")),
                multiple,
            },
        },
        style: {
            display: "flex",
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(1),
            gap: themeSpacing(1),
            borderRadius: themeSpacing(2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            outlineOffset: "-1px",
        }
    };
}

export { toggleGroup };
