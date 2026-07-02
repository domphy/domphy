// Aceternity UI "Gooey Input" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// compact icon-sized search trigger that morphs into a full-width text
// field through a fluid gooey blob-merge transition rather than a plain
// resize.
//
// The goo illusion is the well-documented SVG-filter recipe (a Gaussian
// blur followed by a color-matrix threshold, referenced via `filter:
// url(#id)` on a dedicated "chrome" wrapper) — the same technique this
// package's `squigglyText.ts` already uses for its own SVG-filter chain, and
// not unique to any one UI library. `stdDeviation` is a literal-camelCase
// SVG presentation attribute (like `baseFrequency`/`numOctaves` on
// `<feTurbulence>`, which `squigglyText.ts` already required); it was
// missing from `packages/core/src/constants/CamelAttributes.ts` (confirmed
// by inspection — its typing already existed in `HtmlAttributeMap.ts`), so
// it would have been written to the DOM as `std-deviation`, an attribute the
// SVG filter spec doesn't recognize. Fixed at the source in this change
// (additive only, `stdDeviation` + `colorInterpolationFilters`), matching
// `squigglyText.ts`'s own documented precedent for the same class of gap.
//
// Geometry: the icon bubble stays pinned at the chrome group's origin; the
// pill box sits underneath/behind it at rest (same footprint, clipped by
// the collapsed chrome wrapper's own width so only a same-sized circular
// slice is visible — reading as one shape even before the filter kicks in),
// then animates its own `left`/`width` out to sit `offset` px clear of the
// icon and fill `expandedWidth` px. Both the chrome wrapper's width and the
// pill box's left/width are driven by `motion()` with a `State<MotionKeyframe>`
// (this package's `layoutTextFlip.ts` badge-width idiom) so a single State
// write re-triggers a WAAPI tween on all three properties in lockstep. The
// blur/color-matrix filter is applied to the chrome group ONLY while a
// transition is in flight (`isTransitioning`) — per the spec's own
// performance guidance, removed once the shapes have settled at rest. The
// real `<input>` text sits OUTSIDE the filtered chrome group as a sibling
// layered on top, so glyphs stay crisp and unaffected by the blur.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString, toState, watch } from "@domphy/core";
import type { MotionKeyframe } from "@domphy/ui";
import { motion } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface GooeyInputProps {
  /** Placeholder text shown once expanded. Defaults to `"Search…"`. */
  placeholder?: string;
  /** Initial/controlled text content. Defaults to `""`. */
  value?: string;
  /** Collapsed pill/circle width, in px. Defaults to `115`. */
  collapsedWidth?: number;
  /** Expanded text-field width, in px. Defaults to `200`. */
  expandedWidth?: number;
  /** Gap, in px, between the detached icon bubble and the expanded field once open. Defaults to `50`. */
  offset?: number;
  /** Gaussian blur `stdDeviation` driving the goo merge — higher reads gooier. Defaults to `5`. */
  blurStrength?: number;
  /** Fires with the live text value as the user types. */
  onValueChange?: (value: string) => void;
  /** Fires whenever the expanded/collapsed state toggles. */
  onOpenChange?: (open: boolean) => void;
  /** Disables the trigger and field entirely. Defaults to `false`. */
  disabled?: boolean;
  /** Extra class name merged onto the outer wrapper's native `class` attribute. */
  className?: string;
  /** Extra class name merged onto the icon bubble button. */
  iconClassName?: string;
  /** Extra class name merged onto the pill/field box. */
  boxClassName?: string;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

const ICON_DIAMETER_PX = 44;
const TRANSITION_DURATION_MS = 380;
const TRANSITION_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";

// Visually-hidden but screen-reader-visible label text, matching
// `canvasText.ts`'s own `SR_ONLY_STYLE` idiom.
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

let gooeyInputInstanceCounter = 0;

/** Magnifying-glass glyph, hand-composed from a circle + a diagonal handle line — not traced from any icon library. */
function searchGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { circle: null, cx: "10", cy: "10", r: "6", fill: "none", stroke: "currentColor", strokeWidth: "2" } as DomphyElement,
          { line: null, x1: "14.5", y1: "14.5", x2: "20", y2: "20", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" } as DomphyElement,
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        role: "img",
        ariaHidden: "true",
        style: { width: "48%", height: "48%" },
      } as DomphyElement<"svg">,
    ],
    style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" } as StyleObject,
  };
}

/** Hidden SVG holding the blur + color-matrix "goo" filter chain, referenced via `filter: url(#id)`. */
function gooFilterDefs(filterId: string, blurStrength: number): DomphyElement<"svg"> {
  return {
    svg: [
      {
        defs: [
          {
            filter: [
              {
                feGaussianBlur: null,
                in: "SourceGraphic",
                stdDeviation: String(blurStrength),
                colorInterpolationFilters: "sRGB",
                result: "goo-blur",
              } as DomphyElement,
              {
                feColorMatrix: null,
                in: "goo-blur",
                type: "matrix",
                values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7",
                result: "goo-threshold",
              } as DomphyElement,
              { feBlend: null, in: "SourceGraphic", in2: "goo-threshold" } as DomphyElement,
            ],
            id: filterId,
          } as DomphyElement,
        ],
      } as DomphyElement,
    ],
    ariaHidden: "true",
    _key: "goo-filter-defs",
    style: { position: "absolute", width: 0, height: 0, overflow: "hidden" } as StyleObject,
  } as DomphyElement<"svg">;
}

/**
 * A compact icon-sized search trigger that morphs into a full-width text
 * field via a fluid gooey blob-merge transition. Call with no arguments for
 * a working demo.
 */
function gooeyInput(props: GooeyInputProps = {}): DomphyElement<"div"> {
  const instanceId = ++gooeyInputInstanceCounter;
  const placeholder = props.placeholder ?? "Search…";
  const collapsedWidth = Math.max(ICON_DIAMETER_PX, props.collapsedWidth ?? 115);
  const expandedWidth = Math.max(collapsedWidth, props.expandedWidth ?? 200);
  const offset = Math.max(0, props.offset ?? 50);
  const blurStrength = Math.max(0, props.blurStrength ?? 5);
  const disabled = props.disabled ?? false;
  const onValueChange = props.onValueChange;
  const onOpenChange = props.onOpenChange;

  const filterId = `domphy-gooey-input-${instanceId}-${hashString(String(blurStrength))}`;
  const inputId = `domphy-gooey-input-field-${instanceId}`;
  const totalCollapsedWidth = ICON_DIAMETER_PX;
  const totalExpandedWidth = ICON_DIAMETER_PX + offset + expandedWidth;

  const value = toState(props.value ?? "");
  const isOpen = toState(false);
  const isTransitioning = toState(false);

  const chromeWidth = toState<MotionKeyframe>({ width: `${totalCollapsedWidth}px` });
  const pillGeometry = toState<MotionKeyframe>({ left: "0px", width: `${collapsedWidth}px` });

  let wrapperDomElement: HTMLElement | null = null;
  let inputDomElement: HTMLInputElement | null = null;
  let transitionSettleTimer: ReturnType<typeof setTimeout> | null = null;

  function setOpen(nextOpen: boolean): void {
    if (disabled || isOpen.get() === nextOpen) return;
    isOpen.set(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function toggle(): void {
    setOpen(!isOpen.get());
  }

  const srOnlyLabel: DomphyElement<"label"> = {
    label: placeholder,
    for: inputId,
    style: SR_ONLY_STYLE as StyleObject,
  };

  const inputElement: DomphyElement<"input"> = {
    input: null,
    type: "text",
    id: inputId,
    placeholder,
    disabled,
    tabindex: (listener: Listener) => (isOpen.get(listener) ? 0 : -1),
    value: (listener: Listener) => value.get(listener),
    onInput: (event: Event) => {
      const nextValue = (event.target as HTMLInputElement).value;
      value.set(nextValue);
      onValueChange?.(nextValue);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    },
    _onMount: (node: ElementNode) => {
      inputDomElement = node.domElement as HTMLInputElement;
    },
    style: {
      position: "absolute",
      top: 0,
      left: `${ICON_DIAMETER_PX + offset}px`,
      height: `${ICON_DIAMETER_PX}px`,
      width: `${expandedWidth}px`,
      zIndex: 2,
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-10", "neutral"),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      opacity: (listener: Listener) => (isOpen.get(listener) ? 1 : 0),
      pointerEvents: (listener: Listener) => (isOpen.get(listener) ? "auto" : "none"),
      transition: `opacity ${TRANSITION_DURATION_MS}ms ${TRANSITION_EASING}`,
    } as StyleObject,
  };

  const iconBubble: DomphyElement<"button"> = {
    button: [searchGlyph()],
    type: "button",
    disabled,
    ariaLabel: (listener: Listener) => (isOpen.get(listener) ? "Close search" : "Open search"),
    ariaExpanded: (listener: Listener) => isOpen.get(listener),
    class: props.iconClassName,
    onClick: toggle,
    dataTone: "shift-16",
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      zIndex: 3,
      appearance: "none",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      width: `${ICON_DIAMETER_PX}px`,
      height: `${ICON_DIAMETER_PX}px`,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      opacity: disabled ? 0.6 : 1,
      "&[disabled]": { cursor: "not-allowed" },
    } as StyleObject,
  };

  const pillBox: DomphyElement<"div"> = {
    div: null,
    ariaHidden: "true",
    class: props.boxClassName,
    dataTone: "shift-16",
    style: {
      position: "absolute",
      top: 0,
      // Static baseline matching `pillGeometry`'s initial value — `motion()`
      // still fires an implicit-keyframe animate() on mount, but animating
      // from this value to the identical target is a visual no-op, so there
      // is no flash-from-unstyled before the first real toggle (mirrors
      // `layoutTextFlip.ts`'s own "write the first value directly" fix for
      // the same WAAPI-on-mount behavior).
      left: 0,
      width: `${collapsedWidth}px`,
      height: `${ICON_DIAMETER_PX}px`,
      borderRadius: themeSpacing(999),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
    $: [motion({ animate: pillGeometry, transition: { duration: TRANSITION_DURATION_MS, easing: TRANSITION_EASING } })],
  };

  const chromeGroup: DomphyElement<"div"> = {
    div: [pillBox, iconBubble],
    ariaHidden: "true",
    style: {
      position: "relative",
      // Static baseline matching `chromeWidth`'s initial value — see the
      // note on `pillBox` above.
      width: `${totalCollapsedWidth}px`,
      height: `${ICON_DIAMETER_PX}px`,
      overflow: "hidden",
      filter: (listener: Listener) => (isTransitioning.get(listener) ? `url(#${filterId})` : "none"),
    } as StyleObject,
    $: [motion({ animate: chromeWidth, transition: { duration: TRANSITION_DURATION_MS, easing: TRANSITION_EASING } })],
  };

  function applyTransition(open: boolean): void {
    isTransitioning.set(true);
    // `chromeGroup` itself grows to exactly the pill's expanded right edge
    // (see its own width formula), so its permanent `overflow: hidden`
    // needs no toggling — collapsed, it clips the wider-at-rest pill down
    // to the icon's own footprint; expanded, nothing is left to clip.
    chromeWidth.set({ width: `${open ? totalExpandedWidth : totalCollapsedWidth}px` });
    pillGeometry.set(
      open
        ? { left: `${ICON_DIAMETER_PX + offset}px`, width: `${expandedWidth}px` }
        : { left: "0px", width: `${collapsedWidth}px` },
    );

    if (transitionSettleTimer) clearTimeout(transitionSettleTimer);
    transitionSettleTimer = setTimeout(() => {
      isTransitioning.set(false);
      transitionSettleTimer = null;
    }, TRANSITION_DURATION_MS + 80);

    if (open) {
      setTimeout(() => inputDomElement?.focus(), TRANSITION_DURATION_MS * 0.6);
    } else {
      inputDomElement?.blur();
    }
  }

  return {
    div: [srOnlyLabel, gooFilterDefs(filterId, blurStrength), chromeGroup, inputElement],
    class: props.className,
    style: {
      position: "relative",
      display: "inline-block",
      height: `${ICON_DIAMETER_PX}px`,
      width: `${totalExpandedWidth}px`,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      wrapperDomElement = node.domElement as HTMLElement;
      if (typeof window === "undefined") return;

      const stopWatch = watch(isOpen, (open) => applyTransition(open));

      const handlePointerDown = (event: PointerEvent) => {
        if (!isOpen.get() || !wrapperDomElement) return;
        if (!wrapperDomElement.contains(event.target as Node)) setOpen(false);
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && isOpen.get()) setOpen(false);
      };
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      node.addHook("Remove", () => {
        stopWatch();
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
        if (transitionSettleTimer) clearTimeout(transitionSettleTimer);
      });
    },
  };
}

export { gooeyInput };
