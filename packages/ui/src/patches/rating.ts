import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

const STAR_FILLED =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">` +
  `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>` +
  `</svg>`;
const STAR_EMPTY =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">` +
  `<path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>` +
  `</svg>`;

/**
 * Interactive star rating applied to a container `<div>`. Manages its own star
 * children: click to set, Arrow keys to adjust, hover to preview. In `readOnly`
 * mode stars are non-interactive. Apply to a `<div>` element.
 *
 * @hostTag div
 * @param props.value - Current rating (0 – max). `ValueOrState<number>`, defaults to `0`.
 * @param props.max - Total number of stars. Optional `number`, defaults to `5`.
 * @param props.onChange - Called with the new value when the user picks a star.
 * @param props.readOnly - Disable interaction. Optional `boolean`, defaults to `false`.
 * @param props.color - Star color tone. Optional `ThemeColor`, defaults to `"warning"`.
 * @example { div: null, $: [rating({ value: ratingState, onChange: (v) => ratingState.set(v) })] }
 */
function rating(
  props: {
    value?: ValueOrState<number>;
    max?: number;
    onChange?: (value: number) => void;
    readOnly?: boolean;
    color?: ThemeColor;
  } = {},
): PartialElement {
  const { max = 5, readOnly = false, onChange } = props;
  const color = props.color ?? "warning";
  const valueState = toState(props.value ?? 0);

  return {
    role: "group",
    ariaLabel: "Rating",
    style: {
      display: "inline-flex",
      gap: themeSpacing(0.5),
      fontSize: "1.5rem",
      cursor: readOnly ? "default" : "pointer",
      color: (listener) => themeColor(listener, "shift-8", color),
    },
    _onMount: (node) => {
      const container = node.domElement as HTMLElement;
      let current = valueState.get();
      let hovered = 0;

      const render = () => {
        const active = hovered > 0 ? hovered : current;
        Array.from(container.children).forEach((star, i) => {
          (star as HTMLElement).innerHTML = i < active ? STAR_FILLED : STAR_EMPTY;
        });
      };

      container.innerHTML = "";
      for (let i = 1; i <= max; i++) {
        const star = document.createElement("button");
        star.type = "button";
        star.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);
        star.style.cssText =
          "background:none;border:none;padding:0;cursor:inherit;color:inherit;font-size:inherit;display:flex;align-items:center;";

        if (!readOnly) {
          const index = i;
          star.addEventListener("click", () => {
            const next = index === current ? 0 : index;
            current = next;
            valueState.set(next);
            onChange?.(next);
            hovered = 0;
            render();
          });
          star.addEventListener("mouseenter", () => {
            hovered = index;
            render();
          });
          star.addEventListener("mouseleave", () => {
            hovered = 0;
            render();
          });
          star.addEventListener("keydown", (e: KeyboardEvent) => {
            let next = current;
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              next = Math.min(max, current + 1);
              e.preventDefault();
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              next = Math.max(0, current - 1);
              e.preventDefault();
            } else {
              return;
            }
            current = next;
            valueState.set(next);
            onChange?.(next);
            render();
            const target = next > 0 ? next - 1 : 0;
            (container.children[target] as HTMLElement)?.focus();
          });
        }
        container.appendChild(star);
      }
      render();

      const release = valueState.addListener((v) => {
        current = v;
        if (hovered === 0) render();
      });
      node.addHook("Remove", release);
    },
  };
}

export { rating };
