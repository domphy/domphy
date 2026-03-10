import { type PartialElement, merge, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

function splitter(props: {
    direction?: "horizontal" | "vertical";
    defaultSize?: number;
    min?: number;
    max?: number;
} = {}): PartialElement {
    const { direction = "horizontal", defaultSize = 50, min = 10, max = 90 } = props;
    return {
        _onSchedule: (node, element) => {
            merge(element, {
                _context: {
                    splitter: {
                        direction,
                        size: toState(defaultSize),
                        min,
                        max,
                    },
                },
            });
        },
        style: {
            display: "flex",
            flexDirection: direction === "horizontal" ? "row" : "column",
            overflow: "hidden",
        },
    };
}

function splitterPanel(): PartialElement {
    return {
        _onMount: (node) => {
            const ctx = node.getContext("splitter");
            const el = node.domElement as HTMLElement;
            const prop = ctx.direction === "horizontal" ? "width" : "height";

            el.style[prop] = `${ctx.size.get()}%`;
            el.style.flexShrink = "0";
            el.style.overflow = "auto";

            const release = ctx.size.onChange((size: number) => {
                el.style[prop] = `${size}%`;
            });
            node.addHook("Remove", release);
        },
    };
}

function splitterHandle(): PartialElement {
    return {
        _onMount: (node) => {
            const ctx = node.getContext("splitter");
            const handle = node.domElement as HTMLElement;
            const isHorizontal = ctx.direction === "horizontal";

            handle.style.cursor = isHorizontal ? "col-resize" : "row-resize";

            const onMousedown = (e: MouseEvent) => {
                e.preventDefault();
                const container = handle.parentElement!;

                const onMousemove = (e: MouseEvent) => {
                    const rect = container.getBoundingClientRect();
                    const raw = isHorizontal
                        ? ((e.clientX - rect.left) / rect.width) * 100
                        : ((e.clientY - rect.top) / rect.height) * 100;
                    ctx.size.set(Math.min(Math.max(raw, ctx.min), ctx.max));
                };

                const onMouseup = () => {
                    document.removeEventListener("mousemove", onMousemove);
                    document.removeEventListener("mouseup", onMouseup);
                };

                document.addEventListener("mousemove", onMousemove);
                document.addEventListener("mouseup", onMouseup);
            };

            handle.addEventListener("mousedown", onMousedown);
            node.addHook("Remove", () => handle.removeEventListener("mousedown", onMousedown));
        },
        style: {
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: (listener) => themeColor(listener, "shift-2"),
            "&:hover": {
                backgroundColor: (listener) => themeColor(listener, "shift-3"),
            },
            "&::after": {
                content: '""',
                borderRadius: themeSpacing(999),
                backgroundColor: (listener) => themeColor(listener, "shift-4"),
            },
        },
    };
}

export { splitter, splitterPanel, splitterHandle };
