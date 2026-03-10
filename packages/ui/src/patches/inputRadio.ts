import { PartialElement } from "@domphy/core";
import { themeColor, ThemeColor, themeSize, themeSpacing } from "@domphy/theme";

function inputRadio(props: { color?: ThemeColor, accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "radio",
        _onInsert: (node) => {
            if (node.tagName != "input") {
                console.warn(`"inputRadio" primitive patch must use input tag and radio type`);
                return;
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            appearance: "none",
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
                borderRadius: "50%",
                lineHeight: 1,
                cursor: "pointer",
                border: "none",
                outlineOffset: "-1px",
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
                color: (listener) => themeColor(listener, "shift-6", color),
                width: themeSpacing(4),
                height: themeSpacing(4)
            },
            "&:hover::before": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&:checked::before": {
                outline: (listener) => `1px solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&:checked::after": {
                content: `""`,
                position: "absolute",
                inset: "30%",
                borderRadius: "50%",
                backgroundColor: (listener) => themeColor(listener, "shift-5", accentColor),
            },
            "&:checked:hover:not([disabled])::before": {
                backgroundColor: (listener) => themeColor(listener, "shift-4", accentColor),
            },
            "&:focus-visible": {
                borderRadius: "50%",
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&[disabled]": {
                cursor: "not-allowed",
            },
            "&[disabled]::before, &[disabled]::after": {
                outline: "none",
                backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
                pointerEvents: "none",
            },
        }
    }
}

export { inputRadio };
