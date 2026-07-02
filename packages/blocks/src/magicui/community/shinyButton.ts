// Magic UI "Shiny Button" — clean-room reimplementation.
//
// A pill-shaped button whose surface is continuously swept, on an endless
// loop, by a soft diagonal light streak — a glossy/metallic sheen rather than
// a hard highlight. Implemented purely from the block's public
// functional/visual spec — no upstream Magic UI source was viewed or copied.
//
// The upstream docs page only documents `className`/`children` — duration and
// streak width aren't published, so this mirrors the sibling "shiny text"
// shimmer technique already ported in this package (background-position
// keyframe over a few seconds, infinite loop) and exposes both as CSS custom
// properties (with sane JS-prop defaults) so a caller can retune them without
// a new prop surface, per the spec's own suggestion.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface ShinyButtonProps {
  /** Label content. Plain text or a full element (e.g. text + icon). Defaults to `"Shiny Button"`. */
  children?: string | DomphyElement | DomphyElement[];
  /** Click handler. */
  onClick?: (event: MouseEvent) => void;
  /** Disables the button (dims it and stops the pointer cursor; the shimmer keeps looping). */
  disabled?: boolean;
  /** One full shimmer sweep, in ms. Also exposed as `--shiny-button-duration` for CSS-side tuning. Defaults to `3000`. */
  duration?: number;
  /** Streak band width, as a percent of the button's own box. Also exposed as `--shiny-button-shimmer-width`. Defaults to `35`. */
  shimmerWidth?: number;
  /** Passthrough style merged onto the button. */
  style?: StyleObject;
}

let shinyButtonInstanceCounter = 0;

/**
 * A fully-rounded pill button with a continuous, non-hover-gated diagonal
 * light shimmer sweeping across its surface. Hover adds a mild scale/
 * brightness bump; click behaves like an ordinary button. Call with no
 * arguments for a working demo.
 */
function shinyButton(props: ShinyButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Shiny Button";
  const disabled = props.disabled ?? false;
  const duration = props.duration ?? 3000;
  const shimmerWidth = props.shimmerWidth ?? 35;

  const instanceId = ++shinyButtonInstanceCounter;
  const halfBand = shimmerWidth / 2;
  const keyframes = {
    from: { backgroundPosition: "-150% 0" },
    to: { backgroundPosition: "150% 0" },
  };
  const animationName = `shiny-button-sweep-${hashString(
    JSON.stringify({ instanceId, shimmerWidth }),
  )}`;

  const labelChildren: DomphyElement[] =
    typeof label === "string"
      ? [{ span: label } as DomphyElement]
      : Array.isArray(label)
        ? label
        : [label];

  const buttonElement: DomphyElement<"button"> = {
    button: labelChildren,
    type: "button",
    disabled,
    // `dataTone` anchors a self-contained edge surface (light-in-light-theme,
    // dark-in-dark-theme per the spec) — `inherit` then paints exactly that
    // context instead of a hardcoded shift, per the doctor's tone contract.
    dataTone: "shift-1",
    style: {
      position: "relative",
      appearance: "none",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "fit-content",
      userSelect: "none",
      borderRadius: themeSpacing(999),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      // The streak: a transparent-flanked band swept via `background-position`
      // over an oversized `background-size`, layered on top of the solid
      // `backgroundColor` above (same technique as `animatedShinyText`/
      // `glareHover`). `shift-11` (not a small shift) so it reads as a
      // distinguishable highlight against the button's own near-edge surface.
      backgroundImage: (listener: Listener) =>
        `linear-gradient(105deg, transparent ${50 - halfBand - 10}%, color-mix(in srgb, ${themeColor(listener, "shift-11", "neutral")} 55%, transparent) 50%, transparent ${50 + halfBand + 10}%)`,
      backgroundSize: "220% 100%",
      backgroundRepeat: "no-repeat",
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      outlineOffset: "-1px",
      opacity: disabled ? 0.6 : 1,
      transition: "transform 150ms ease, filter 150ms ease, opacity 150ms ease",
      animation: `${animationName} var(--shiny-button-duration, ${duration}ms) linear infinite`,
      "--shiny-button-duration": `${duration}ms`,
      "--shiny-button-shimmer-width": `${shimmerWidth}%`,
      [`@keyframes ${animationName}`]: keyframes,
      "&:hover:not([disabled])": {
        transform: "scale(1.02)",
        filter: "brightness(1.06)",
      },
      "&:focus-visible": {
        boxShadow: (listener: Listener) =>
          `0 0 0 ${themeSpacing(0.5)} ${themeColor(listener, "shift-6", "primary")}`,
      },
      "&[disabled]": {
        cursor: "not-allowed",
        animationPlayState: "paused",
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };

  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { shinyButton };
