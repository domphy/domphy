import { PartialElement } from "@domphy/core";
import { ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

function inputSwitch(props: { accentColor?: ThemeColor } = {}): PartialElement {
    const { accentColor = "primary" } = props;

    return {
        dataTone: "increase-2",
        type: "checkbox",
        _onSchedule: (node) => {
            if (node.tagName != "input") {
                console.warn(`"inputSwitch" primitive patch must use input tag`);
                return;
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            appearance: "none",
            position: "relative",
            display: "inline-flex",
            width: themeSpacing(8),
            height: themeSpacing(6),
            cursor: "pointer",
            margin: `0`,
            paddingBlock: themeSpacing(1),
            "&:checked": {
                "&::before": {
                    backgroundColor: (listener) => themeColor(listener, "increase-3", accentColor),
                },
                "&::after": {
                    left: `calc(100% - ${themeSpacing(3.5)})`,
                },
            },
            "&::after": {
                content: `""`,
                aspectRatio: `1/1`,
                position: "absolute",
                width: themeSpacing(3),
                height: themeSpacing(3),
                borderRadius: themeSpacing(999),
                left: themeSpacing(0.5),
                top: "50%",
                transform: "translateY(-50%)",
                transition: "left 0.3s",
                backgroundColor: (listener) => themeColor(listener, "decrease-3"),
            },
            "&::before": {
                content: '""',
                width: "100%",
                borderRadius: themeSpacing(999),
                display: "inline-block",
                fontSize: (listener) => themeSize(listener, "inherit"),
                lineHeight: 1,
                backgroundColor: (listener) => themeColor(listener),
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
            }
        },
    };
}

export { inputSwitch };
