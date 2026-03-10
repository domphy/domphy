import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function inputFile(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "file",
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputFile" primitive patch must use input tag`);
            }
            (element as any).type = "file";
        },
        style: {
            fontFamily: "inherit",
            fontSize: (listener) => themeSize(listener, "inherit"),
            lineHeight: "inherit",
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            borderRadius: themeSpacing(2),
            height: themeSpacing(8),
            paddingInline: themeSpacing(1),
            "&::file-selector-button": {
                marginBlock: "auto",
                fontFamily: "inherit",
                fontSize: "inherit",
                border: "none",
                borderRadius: themeSpacing(1),
                height: themeSpacing(6),
                paddingInline: themeSpacing(2),
                cursor: "pointer",
                color: (listener) => themeColor(listener, "shift-7", accentColor),
                backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor),
            },
            "&::-webkit-file-upload-button": {
                marginTop: themeSpacing(1),
                fontFamily: "inherit",
                fontSize: "inherit",
                border: "none",
                borderRadius: themeSpacing(1),
                height: themeSpacing(6),
                paddingInline: themeSpacing(2),
                cursor: "pointer",
                color: (listener) => themeColor(listener, "shift-7", color),
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-5", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
            },
            "&[disabled]::file-selector-button, &[disabled]::-webkit-file-upload-button": {
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-5", "neutral"),
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
            },
        },
    };
}

export { inputFile };
