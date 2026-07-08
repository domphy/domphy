// magicui "Interactive Hover Button" — verified directly against the real
// upstream source (registry/magicui/interactive-hover-button.tsx, MIT-licensed).
// A pill-shaped button whose resting state shows a small accent dot followed
// by a neutral-foreground label on a neutral `bg-background` face; on hover the
// label swaps for an arrow-and-label pair while the dot scales up far past its
// own bounds so it floods the button with a solid accent color.
//
// Pure CSS: no JS timers or pointer handlers. The whole effect is driven by
// nested `&:hover [data-*]` selectors on the button's own style object (the
// same technique `glareHover.ts` uses for its hover-armed sweep), so hover
// and un-hover both animate via the browser's native `:hover` transition
// engine with a single shared 300ms duration (upstream's `duration-300`).
//
// The flood is a scale trick, not a background-color transition: the dot
// starts as a small circle and scales up ~100x on hover, which — combined
// with the button's own `overflow: hidden` — reads as the accent color
// washing over the whole face rather than a visibly growing circle.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface InteractiveHoverButtonProps {
  /** Button label. Defaults to `"Get Started"`. */
  children?: string;
  /** Theme color family for the accent dot, flood, and outline. Defaults to `"primary"`. */
  color?: ThemeColor;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  /** Passthrough style merged onto the button. */
  style?: StyleObject;
}

/** Simple right-pointing arrow glyph, matching `heroVideoDialog.ts`'s inline-SVG icon pattern. */
function arrowGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { line: null, x1: "5", y1: "12", x2: "19", y2: "12" },
          { polyline: null, points: "12 5 19 12 12 19" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    // Upstream renders lucide's `<ArrowRight />` at its default 24px size
    // (`themeSpacing(6)` == 1.5em == 24px at the root em).
    style: { display: "inline-flex", width: themeSpacing(6), height: themeSpacing(6) },
  };
}

/** Small resting-state accent dot that scales up into a full-face color flood on hover. */
function accentDot(color: ThemeColor): DomphyElement<"span"> {
  return {
    span: null,
    dataIhbDot: "true",
    ariaHidden: "true",
    // Decorative flood dot with no text of its own — exempt from the
    // missing-color contract, matching meteors.ts's dot span. Also exempt
    // from tone-background-inherit: the dot is intentionally a fixed bright
    // accent (it floods the button on hover), not a surface that should
    // track the ambient dataTone context.
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      flexShrink: 0,
      width: themeSpacing(2),
      height: themeSpacing(2),
      borderRadius: "50%",
      transformOrigin: "center",
      transform: "scale(1)",
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-9", color),
      transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      pointerEvents: "none",
      zIndex: 0,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/**
 * A pill-shaped button that swaps its label for an arrow-and-label pair on
 * hover while a small accent dot scales up into a full-face color flood.
 * Call with no arguments for a working demo button.
 */
function interactiveHoverButton(props: InteractiveHoverButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Get Started";
  const color = props.color ?? "primary";

  const restingLabel: DomphyElement<"span"> = {
    span: label,
    dataIhbLabel: "true",
    style: {
      position: "relative",
      zIndex: 1,
      transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    } as StyleObject,
  };

  const restingGroup: DomphyElement<"span"> = {
    span: [accentDot(color), restingLabel],
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(2),
    } as StyleObject,
  };

  const hoverOverlay: DomphyElement<"span"> = {
    span: [{ span: label, style: { position: "relative" } } as DomphyElement<"span">, arrowGlyph()],
    dataIhbOverlay: "true",
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInlineStart: 0,
      insetInlineEnd: 0,
      insetBlockStart: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(2),
      zIndex: 1,
      opacity: 0,
      pointerEvents: "none",
      // "shift-0" (the lightest edge tone) so the swapped label reads clearly
      // once the accent dot has flooded the button — the same "light text on
      // a saturated fill" convention `rainbowButton.ts` uses for its filled
      // variant.
      color: (listener: Listener) => themeColor(listener, "shift-0", color),
      // Upstream's initial offset is `translate-x-12` == 48px == themeSpacing(12).
      transform: `translate(${themeSpacing(12)}, -50%)`,
      transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    } as StyleObject,
  };

  const buttonElement: DomphyElement<"button"> = {
    button: [restingGroup, hoverOverlay],
    type: "button",
    disabled: props.disabled,
    style: {
      position: "relative",
      overflow: "hidden",
      appearance: "none",
      border: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: props.disabled ? "not-allowed" : "pointer",
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      // Upstream `font-semibold`.
      fontWeight: 600,
      // Upstream `p-2 px-6`: 8px block / 24px inline == themeSpacing(2)/themeSpacing(6).
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(6),
      // A radius far beyond any realistic box half-height forces a full
      // pill shape — the browser clamps it to the shape's own geometry (not
      // tracked by the raw-spacing-value doctor rule, which only checks
      // margin/padding/gap props). Same trick `rainbowButton.ts` uses.
      borderRadius: "999px",
      // Upstream's chrome is neutral, not accent-tinted: a plain `border`
      // (theme `--border` gray) and default `--foreground` text on the
      // `bg-background` surface. Only the dot + hover overlay carry the accent
      // `color` family. Neutral tones here mirror sibling `shinyButton.ts`.
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      outlineOffset: "-1px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      opacity: props.disabled ? 0.6 : 1,
      // Upstream `group-hover:scale-[100.8]`.
      "&:hover:not([disabled]) [data-ihb-dot]": { transform: "scale(100.8)" },
      // Upstream `group-hover:translate-x-12` (48px) + `group-hover:opacity-0`.
      "&:hover:not([disabled]) [data-ihb-label]": {
        opacity: 0,
        transform: `translateX(${themeSpacing(12)})`,
      },
      // Upstream `group-hover:-translate-x-5` (-20px), keeping the -50% vertical centering.
      "&:hover:not([disabled]) [data-ihb-overlay]": {
        opacity: 1,
        transform: `translate(${themeSpacing(-5)}, -50%)`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { interactiveHoverButton };
