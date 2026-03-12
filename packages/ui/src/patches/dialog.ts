import { type PartialElement, type ValueOrState, toState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function dialog(props: { color?: ThemeColor; open?: ValueOrState<boolean> } = {}): PartialElement {
    const { color = "neutral", open = false } = props;
    const state = toState(open)
    return {
        _onInsert: (node) => {
            if (node.tagName != "dialog") {
                console.warn(`"dialog" primitive patch must use dialog tag`);
            }
        },
        onClick: (e: MouseEvent, node) => {
            if (e.target !== node.domElement) return
            const r = node.domElement!.getBoundingClientRect()
            const inside =
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            if (!inside) state.set(false)
        },
        onTransitionEnd: (_e, node) => {
            const dlg = node.domElement as HTMLDialogElement
            if (dlg.style.opacity === "0") {
                dlg.close()
                document.body.style.overflow = ""
            }
        },
        _onMount: (node) => {
            const dlg = node.domElement as HTMLDialogElement
            const update = (val: boolean) => {
                if (val) {
                    dlg.showModal()
                    document.body.style.overflow = "hidden"
                    requestAnimationFrame(() => {
                        dlg.style.opacity = "1"
                        const focusable = dlg.querySelector<HTMLElement>(
                            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                        )
                        focusable?.focus()
                    })
                } else {
                    dlg.style.opacity = "0"
                }
            }
            update(state.get())
            state.onChange(update)
        },
        style: {
            opacity: "0",
            transition: "opacity 200ms ease",
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-7", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            padding: (listener) => themeSpacing(themeDensity(listener) * 3),
            boxShadow: (listener) => `0 ${themeSpacing(8)} ${themeSpacing(16)} ${themeColor(listener, "shift-3", "neutral")}`,
            "&::backdrop": {
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
                opacity: 0.75,
            }
        },
    };
}

export { dialog };
