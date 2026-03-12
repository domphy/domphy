import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

function buttonSwitch(props: {
    checked?: ValueOrState<boolean>;
    accentColor?: ThemeColor;
    color?: ThemeColor;
} = {}): PartialElement {
    const {
        checked = false,
        accentColor = "primary",
        color = "neutral",
    } = props;

    const check = toState(checked);

    return {
        _onSchedule: (node) => {
            if (node.tagName != "button") {
                console.warn(`"buttonSwitch" primitive patch must use button tag`);
            }
        },
        role: "switch",
        ariaChecked: (listener) => check.get(listener),
        dataTone: "shift-2",
        onClick: () => check.set(!check.get()),
        style: {
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            fontSize: (listener) => themeSize(listener),
            border: "none",
            outlineWidth: "1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            minWidth: themeSpacing(12),
            minHeight: themeSpacing(6),
            borderRadius: themeSpacing(999),
            paddingLeft: themeSpacing(7),
            paddingRight: themeSpacing(2),
            transition: "padding-left 0.3s, padding-right 0.3s",
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "& > :first-child": {
                content: '""',
                position: "absolute",
                display: "inline-flex",
                alignItems: "center",
                left: themeSpacing(0.5),
                top: "50%",
                transform: "translateY(-50%)",
                transition: "left 0.3s",
                width: themeSpacing(5),
                height: themeSpacing(5),
                borderRadius: themeSpacing(999),
                color: (listener) => themeColor(listener, "shift-9"),
                backgroundColor: (listener) => themeColor(listener, "decrease-2", color),
            },
            "&[aria-checked=true]": {
                backgroundColor: (listener) => themeColor(listener, "increase-3", accentColor),
                outline: "none",
                color: (listener) => themeColor(listener, "decrease-2"),
                paddingLeft: themeSpacing(2),
                paddingRight: themeSpacing(7),
            },
            "&[aria-checked=true] > :first-child": {
                left: `calc(100% - ${themeSpacing(5.5)})`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
            },
        },
    };
}

export { buttonSwitch };
