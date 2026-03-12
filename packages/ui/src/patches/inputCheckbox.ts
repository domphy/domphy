import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor, themeSize } from "@domphy/theme";

function inputCheckbox(props: { color?: ThemeColor, accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "checkbox",
        _onInsert: (node) => {
            if (node.tagName !== "input") {
                console.warn(`"inputCheckbox" primitive patch must use input tag`);
            }
        },
        style: {
            appearance: "none",
            fontSize: (listener) => themeSize(listener, "inherit"),
            display: "inline-flex",
            position: "relative",
            width: themeSpacing(6),
            height: themeSpacing(6),
            justifyContent: "center",
            alignItems: "center",
            transition: "background-color 300ms, outline-color 300ms",
            margin: 0,
            padding: 0,
            "&::before": {
                content: `""`,
                display: "block",
                borderRadius: themeSpacing(1),
                lineHeight: 1,
                cursor: "pointer",
                border: "none",
                outlineOffset: "-1px",
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
                color: (listener) => themeColor(listener, "shift-9", color),
                width: themeSpacing(4),
                height: themeSpacing(4),
            },
            "&:hover::before": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&:checked::before": {
                outline: (listener) => `1px solid ${themeColor(listener, "shift-6", accentColor)}`,
                backgroundColor: (listener) => themeColor(listener, "shift-8", accentColor),
            },
            "&:checked:hover:not([disabled])::before": {
                backgroundColor: (listener) => themeColor(listener, "shift-7", accentColor),
            },
            "&:checked::after": {
                content: `""`,
                display: "block",
                position: "absolute",
                top: "25%",
                insetInlineStart: "37%",
                width: "20%",
                height: "30%",
                border: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "inherit", accentColor)}`,
                borderTop: 0,
                borderInlineStart: 0,
                transform: "rotate(45deg)",
            },
            "&:indeterminate::before": {
                outline: (listener) => `1px solid ${themeColor(listener, "shift-6", accentColor)}`,
                backgroundColor: (listener) => themeColor(listener, "shift-3", accentColor),
            },
            "&:indeterminate::after": {
                content: `""`,
                position: "absolute",
                inset: "30%",
                backgroundColor: (listener) => themeColor(listener, "shift-8", accentColor),
            },
            "&:indeterminate:hover:not([disabled])::after": {
                backgroundColor: (listener) => themeColor(listener, "shift-7", accentColor),
            },
            "&:focus-visible": {
                borderRadius: themeSpacing(1.5),
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
            },
            "&[disabled]": {
                cursor: "not-allowed",
            },
            "&[disabled]::before, &[disabled]::after": {
                outline: "none",
                backgroundColor: (listener) => themeColor(listener, "shift-4", "neutral"),
                pointerEvents: "none",
            },
        }
    }
}

export { inputCheckbox };
