import { type PartialElement, merge, toState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function command(): PartialElement {
    return {
        _onSchedule: (node, element) => {
            merge(element, {
                _context: {
                    command: {
                        query: toState(""),
                    },
                },
            });
        },
        style: {
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
        },
    };
}

function commandSearch(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;
    return {
        _onInsert: (node) => {
            if (node.tagName !== "input") {
                console.warn(`"commandSearch" patch must use input tag`);
            }
        },
        _onMount: (node) => {
            const ctx = node.getContext("command");
            const input = node.domElement as HTMLInputElement;
            const onInput = () => ctx.query.set(input.value);
            input.addEventListener("input", onInput);
            node.addHook("Remove", () => input.removeEventListener("input", onInput));
        },
        style: {
            fontFamily: "inherit",
            fontSize: (listener) => themeSize(listener, "inherit"),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
            border: "none",
            borderBottom: (listener) => `1px solid ${themeColor(listener, "shift-2", color)}`,
            outline: "none",
            color: (listener) => themeColor(listener, "shift-7", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-4"),
            },
            "&:focus-visible": {
                borderBottomColor: (listener) => themeColor(listener, "shift-5", accentColor),
            },
        },
    };
}

function commandItem(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;
    return {
        role: "option",
        _onMount: (node) => {
            const ctx = node.getContext("command");
            const el = node.domElement as HTMLElement;
            const text = el.textContent?.toLowerCase() ?? "";
            const release = ctx.query.onChange((q: string) => {
                el.hidden = q.length > 0 && !text.includes(q.toLowerCase());
            });
            node.addHook("Remove", release);
        },
        style: {
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            width: "100%",
            fontSize: (listener) => themeSize(listener, "inherit"),
            height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            border: "none",
            outline: "none",
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "&:hover:not([disabled])": {
                backgroundColor: (listener) => themeColor(listener, "shift-1", color),
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
                outlineOffset: `-${themeSpacing(0.5)}`,
            },
        },
    };
}

export { command, commandSearch, commandItem };
