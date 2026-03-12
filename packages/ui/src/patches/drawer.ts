import { type PartialElement, type ValueOrState, toState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

type Placement = "left" | "right" | "top" | "bottom";

const translateOut: Record<Placement, string> = {
    left:   "translateX(-100%)",
    right:  "translateX(100%)",
    top:    "translateY(-100%)",
    bottom: "translateY(100%)",
};

const marginMap: Record<Placement, string> = {
    left:   "0 auto 0 0",
    right:  "0 0 0 auto",
    top:    "0 0 auto 0",
    bottom: "auto 0 0 0",
};

const isVertical = (p: Placement) => p === "left" || p === "right";

function drawer(props: {
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    placement?: Placement;
    size?: string;
} = {}): PartialElement {
    const { color = "neutral", open = false, placement = "right", size } = props;
    const state = toState(open);
    const defaultSize = isVertical(placement) ? themeSpacing(80) : themeSpacing(64);
    const drawerSize = size ?? defaultSize;

    return {
        _onInsert: (node) => {
            if (node.tagName !== "dialog") {
                console.warn(`"drawer" patch must use dialog tag`);
            }
        },
        onClick: (e: MouseEvent, node) => {
            if (e.target !== node.domElement) return;
            state.set(false);
        },
        onTransitionEnd: (_e, node) => {
            const dlg = node.domElement as HTMLDialogElement;
            if (!state.get()) {
                dlg.close();
                document.body.style.overflow = "";
            }
        },
        _onMount: (node) => {
            const dlg = node.domElement as HTMLDialogElement;
            const update = (val: boolean) => {
                if (val) {
                    dlg.showModal();
                    document.body.style.overflow = "hidden";
                    requestAnimationFrame(() => { dlg.style.transform = "translate(0, 0)"; });
                } else {
                    dlg.style.transform = translateOut[placement];
                }
            };
            update(state.get());
            state.onChange(update);
        },
        style: {
            transform: translateOut[placement],
            transition: "transform 0.25s ease",
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-10", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            padding: (listener) => themeSpacing(themeDensity(listener) * 3),
            margin: marginMap[placement],
            width:  isVertical(placement) ? drawerSize : "100dvw",
            height: isVertical(placement) ? "100dvh"   : drawerSize,
            maxWidth: "100dvw",
            maxHeight: "100dvh",
            boxShadow: (listener) => `0 ${themeSpacing(4)} ${themeSpacing(12)} ${themeColor(listener, "shift-4", "neutral")}`,
            "&::backdrop": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
                opacity: 0.75,
            },
        },
    };
}

export { drawer };
