import { merge, type PartialElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

/**
 * Root of a resizable split layout. Lays out children as a flex row (horizontal) or column
 * (vertical) and provides a `splitter` context (`{ direction, size, min, max }`) consumed by
 * `splitterPanel` and `splitterHandle`. `size` is a reactive state holding the first panel's
 * percentage. No host-tag check; typically applied to a `div`.
 *
 * @param props.direction - Split orientation, `"horizontal"` | `"vertical"`. Defaults to `"horizontal"`.
 * @param props.defaultSize - Initial size (percentage) of the resizable panel. Defaults to `50`.
 * @param props.min - Minimum panel size (percentage). Defaults to `10`.
 * @param props.max - Maximum panel size (percentage). Defaults to `90`.
 * @example { div: [...], $: [splitter({ direction: "vertical" })] }
 */
function splitter(
  props: {
    direction?: "horizontal" | "vertical";
    defaultSize?: number;
    min?: number;
    max?: number;
  } = {},
): PartialElement {
  const {
    direction = "horizontal",
    defaultSize = 50,
    min = 10,
    max = 90,
  } = props;
  return {
    _onSchedule: (_node, element) => {
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

/**
 * The resizable panel inside a `splitter`. Reads the `splitter` context and binds its
 * width (horizontal) or height (vertical) to the context `size` state, updating reactively as
 * the handle is dragged. Warns if used outside a `splitter`. Takes no props.
 *
 * @example { div: [...], $: [splitterPanel()] }
 */
function splitterPanel(): PartialElement {
  return {
    _onMount: (node) => {
      const ctx = node.getContext("splitter");
      if (!ctx) {
        console.warn(`"splitterPanel" patch must be used inside a "splitter"`);
        return;
      }
      const el = node.domElement as HTMLElement;
      const prop = ctx.direction === "horizontal" ? "width" : "height";

      el.style[prop] = `${ctx.size.get()}%`;
      el.style.flexShrink = "0";
      el.style.overflow = "auto";

      const release = ctx.size.addListener((size: number) => {
        el.style[prop] = `${size}%`;
      });
      node.addHook("Remove", release);
    },
  };
}

/**
 * The draggable divider inside a `splitter`. Reads the `splitter` context, shows the
 * appropriate resize cursor, and on mouse drag updates the context `size` state (clamped to
 * `min`/`max`). Warns if used outside a `splitter`. Takes no props.
 *
 * @example { div: null, $: [splitterHandle()] }
 */
function splitterHandle(): PartialElement {
  return {
    _onMount: (node) => {
      const ctx = node.getContext("splitter");
      if (!ctx) {
        console.warn(`"splitterHandle" patch must be used inside a "splitter"`);
        return;
      }
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
      node.addHook("Remove", () =>
        handle.removeEventListener("mousedown", onMousedown),
      );
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
