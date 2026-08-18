import {
  behavior,
  type DomphyElement,
  type ElementNode,
  isState,
  type Listener,
  type PartialElement,
  rawHtml,
  type State,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

const STAR_FILLED =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">` +
  `<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>` +
  `</svg>`;
const STAR_EMPTY =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">` +
  `<path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/>` +
  `</svg>`;

type RatingProps = {
  value?: ValueOrState<number>;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  color?: ThemeColor;
};

type RatingLive = {
  valueState: State<number>;
  onChange?: (value: number) => void;
  readOnly: boolean;
  max: number;
  color: ThemeColor;
};

function applyRatingProps(live: RatingLive, next: RatingProps): void {
  live.onChange = next.onChange;
  live.readOnly = next.readOnly ?? false;
  live.max = next.max ?? 5;
  live.color = next.color ?? "warning";
  if (isState(next.value)) {
    if (next.value !== live.valueState) {
      live.valueState.set(next.value.get());
    }
  } else if (next.value !== undefined) {
    // Plain number stays live. Omitted value leaves the internal state
    // alone so an uncontrolled click is not reset on a later factory call.
    live.valueState.set(next.value);
  }
}

function insertStar(
  node: ElementNode,
  index: number,
  live: RatingLive,
  hoveredState: State<number>,
): void {
  const activeCount = (listener: Listener) => {
    const hovered = hoveredState.get(listener);
    return hovered > 0 ? hovered : live.valueState.get(listener);
  };

  const star: DomphyElement<"button"> = {
    button: (listener) =>
      rawHtml(index <= activeCount(listener) ? STAR_FILLED : STAR_EMPTY),
    _key: index,
    type: "button",
    ariaLabel: `${index} star${index > 1 ? "s" : ""}`,
    onClick: () => {
      if (live.readOnly) return;
      const next = index === live.valueState.get() ? 0 : index;
      live.valueState.set(next);
      live.onChange?.(next);
      hoveredState.set(0);
    },
    onMouseEnter: () => {
      if (live.readOnly) return;
      hoveredState.set(index);
    },
    onMouseLeave: () => hoveredState.set(0),
    onKeyDown: (e: KeyboardEvent) => {
      if (live.readOnly) return;
      const current = live.valueState.get();
      let next = current;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        next = Math.min(live.max, current + 1);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        next = Math.max(0, current - 1);
        e.preventDefault();
      } else {
        return;
      }
      live.valueState.set(next);
      live.onChange?.(next);
      const target = next > 0 ? next - 1 : 0;
      (node.domElement?.children[target] as HTMLElement)?.focus();
    },
    style: {
      background: "none",
      border: "none",
      outline: "none",
      borderRadius: themeSpacing(1),
      padding: 0,
      cursor: "inherit",
      color: "inherit",
      fontSize: "inherit",
      display: "flex",
      alignItems: "center",
      transition: "box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, live.color),
      },
    },
  };
  node.children.insert(star);
}

function syncStars(
  node: ElementNode,
  live: RatingLive,
  hoveredState: State<number>,
): void {
  const children = node.children.items;
  while (children.length > live.max) {
    node.children.remove(children[children.length - 1]);
  }
  for (let index = children.length + 1; index <= live.max; index++) {
    insertStar(node, index, live, hoveredState);
  }
}

/**
 * Interactive star rating applied to a container `<div>`. Manages its own star
 * children: click to set, Arrow keys to adjust, hover to preview. In `readOnly`
 * mode stars are non-interactive. Apply to a `<div>` element.
 *
 * Star insert runs in `_onInit` (SSR markup). `onChange`/`readOnly`/`max` and
 * a plain-number `value` stay live via `behavior()` `update()` so a reused
 * node picks up the latest factory props.
 *
 * @hostTag div
 * @param props.value - Current rating (0 – max). `ValueOrState<number>`, defaults to `0`.
 * @param props.max - Total number of stars. Optional `number`, defaults to `5`.
 * @param props.onChange - Called with the new value when the user picks a star.
 * @param props.readOnly - Disable interaction. Optional `boolean`, defaults to `false`.
 * @param props.color - Star color tone. Optional `ThemeColor`, defaults to `"warning"`.
 * @example { div: null, $: [rating({ value: ratingState, onChange: (v) => ratingState.set(v) })] }
 */
function rating(props: RatingProps = {}): PartialElement {
  const live: RatingLive = {
    valueState: toState(props.value ?? 0),
    onChange: props.onChange,
    readOnly: props.readOnly ?? false,
    max: props.max ?? 5,
    color: props.color ?? "warning",
  };
  const hoveredState = toState(0);

  return {
    role: "group",
    ariaLabel: "Rating",
    style: {
      display: "inline-flex",
      gap: themeSpacing(0.5),
      // 1.5× inherited control size (theme-owned type scale, not a px/rem literal).
      fontSize: (listener) => themeSize(listener, "increase-1"),
      cursor: live.readOnly ? "default" : "pointer",
      color: (listener) => themeColor(listener, "muted", live.color),
    },
    ...behavior<RatingProps>(
      "rating",
      (node, initial) => {
        applyRatingProps(live, initial);
        syncStars(node, live, hoveredState);
        return {
          update(next) {
            applyRatingProps(live, next);
            syncStars(node, live, hoveredState);
          },
        };
      },
      {
        value: props.value,
        max: props.max ?? 5,
        onChange: props.onChange,
        readOnly: props.readOnly ?? false,
        color: props.color ?? "warning",
      },
    ),
    // Build stars as real child elements (not imperative DOM mutation in
    // _onMount) so generateHTML()/SSR emits the actual star markup.
    _onInit: (node) => {
      syncStars(node, live, hoveredState);
    },
  };
}

export { rating };
