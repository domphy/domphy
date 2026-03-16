import { type PartialElement, type ElementNode } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function toggle(props: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
} = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;
    return {
        role: "button",
        _onInsert: (node) => {
            if (node.tagName !== "button") {
                console.warn(`"toggle" patch must use button tag`);
            }
            const ctx = node.getContext("toggleGroup");
            const children = node.parent?.children.items as ElementNode[]

            let items = children.filter(n => n.type === "ElementNode" && n.attributes.get("role") === "button");
            const key = node.key !== undefined ? String(node.key) : String(items.findIndex(n => n === node));

            node.attributes.set("ariaPressed", (listener) => {
                const val = ctx.value.get(listener);
                return Array.isArray(val) ? val.includes(key) : val === key;
            })

            node.addEvent("click", () => {
                const val = ctx.value.get();
                if (ctx.multiple) {
                    const arr = Array.isArray(val) ? [...val] : [];
                    ctx.value.set(arr.includes(key) ? arr.filter(v => v !== key) : [...arr, key]);
                } else {
                    ctx.value.set(val === key ? "" : key);
                }
            })
        },
        style: {
            cursor: "pointer",
            fontSize: (listener) => themeSize(listener, "inherit"),
            height: themeSpacing(6),
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(2),
            border: "none",
            borderRadius: themeSpacing(1),
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            transition:"background-color 300ms ease",
            "&:hover:not([disabled])": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&[aria-pressed=true]": {
                backgroundColor: (listener) => themeColor(listener, "shift-3", accentColor),
                color: (listener) => themeColor(listener, "shift-12", accentColor),
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
                outlineOffset: `-${themeSpacing(0.5)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
            },
        },
    };
}

export { toggle };
