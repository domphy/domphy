// Magic UI "Shiny Button" — Domphy port of `shiny-button.tsx`.
//
// A `rounded-lg` (not pill) outlined button whose sheen is applied to the
// LABEL GLYPHS and the 1px BORDER RING — not to the whole button fill. Two
// inner spans reproduce upstream's structure:
//   • label span: uppercase / tracking-wide / text-sm text, dimmed to
//     rgb(0,0,0,65%) (light) / rgb(255,255,255,90%) (dark), with a `mask-image`
//     linear-gradient whose thin transparent band sweeps across the glyphs so a
//     shimmer travels over the text (upstream masks the text via a `--x`-driven
//     gradient; a swept `mask-position` is the CSS-native equivalent since a bare
//     custom property can't interpolate without `@property`, which this engine's
//     CSS generator doesn't emit).
//   • border-ring span: `content-box exclude` mask (the magicCard idiom) so only
//     a 1px ring shows, filled by a primary-tinted sheen gradient swept in sync
//     with the label band via `background-position`.
//
// Motion is faithful to upstream's spring feel within CSS's limits: the sweep
// eases with a spring-approximating cubic-bezier and pauses 1s between loops
// (upstream `repeatDelay: 1`); the button pops scale 0.8 → 1 on mount and
// shrinks to 0.95 on press (upstream `whileTap`). Hover raises a box-shadow
// (dark: a primary glow) with no scale, matching upstream's `transition-shadow`.
// Dark theme also paints a top-center primary radial glow, and the button
// carries `backdrop-blur-xl`.
//
// The 3000ms sweep duration and 35% band width remain published-spec
// approximations (see SOURCES.md); everything else tracks the source directly.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface ShinyButtonProps {
  /** Label content. Plain text or a full element (e.g. text + icon). Defaults to `"Shiny Button"`. */
  children?: string | DomphyElement | DomphyElement[];
  /** Click handler. */
  onClick?: (event: MouseEvent) => void;
  /** Disables the button (dims it and stops the pointer cursor; pauses the shimmer). */
  disabled?: boolean;
  /** Moving portion of one shimmer loop, in ms; a 1s pause is added after it (upstream `repeatDelay: 1`).
   * The full loop is also exposed as `--shiny-button-duration` for CSS-side tuning. Defaults to `3000`. */
  duration?: number;
  /** Shimmer band width, as a percent of the button's own box. Also exposed as `--shiny-button-shimmer-width`. Defaults to `35`. */
  shimmerWidth?: number;
  /** Passthrough style merged onto the button. */
  style?: StyleObject;
}

let shinyButtonInstanceCounter = 0;

// Upstream's `--x` sweep spring (stiffness 20 / damping 15 / mass 2) is overdamped
// (ratio ≈ 1.19 → no overshoot, a smooth decel); approximate with an ease-out curve.
const SWEEP_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
// Upstream's mount scale spring (stiffness 200 / damping 5 / mass 0.5) is heavily
// underdamped (ratio ≈ 0.25 → a bouncy pop); approximate with an ease-out-back curve.
const POP_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
// Upstream `repeatDelay: 1` — a 1s pause between each sweep.
const SWEEP_PAUSE_MS = 1000;

/** Normalizes the `string | DomphyElement | DomphyElement[]` label into the flat
 * `(string | DomphyElement)[]` shape a `span`'s content field expects. */
function asContent(value: string | DomphyElement | DomphyElement[]): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * A `rounded-lg` outlined button with a continuous shimmer that sweeps across
 * the label glyphs and around the 1px border, pausing 1s between loops. Pops in
 * on mount, shrinks on press, and raises a shadow (a primary glow in dark theme)
 * on hover. Call with no arguments for a working demo.
 */
function shinyButton(props: ShinyButtonProps = {}): DomphyElement<"button"> {
  const label = props.children ?? "Shiny Button";
  const disabled = props.disabled ?? false;
  const duration = props.duration ?? 3000;
  const shimmerWidth = props.shimmerWidth ?? 35;

  const instanceId = ++shinyButtonInstanceCounter;
  const totalMs = duration + SWEEP_PAUSE_MS;
  // The band moves over [0%, holdPercent] then holds until 100% — that hold is the
  // 1s inter-sweep pause, baked into keyframe stops so a single CSS loop reproduces it.
  const holdPercent = Math.round((duration / totalMs) * 10000) / 100;
  // Band half-width expressed in the 250%-wide gradient's own coordinates
  // (shimmerWidth is a percent of the button box; the gradient is 2.5× the box,
  // so 1% of box = 0.4% of gradient → half-width = shimmerWidth / 5).
  const halfBandGrad = shimmerWidth / 5;

  const hash = hashString(JSON.stringify({ instanceId, shimmerWidth, holdPercent }));
  const labelSweepName = `shiny-button-label-${hash}`;
  const ringSweepName = `shiny-button-ring-${hash}`;
  const popName = `shiny-button-pop-${hash}`;

  // mask-size is 250% and mask-position stays within [0%, 100%], so the opaque
  // flanks always cover the glyphs (the label never blanks) while the thin
  // transparent band enters, crosses, and exits off-screen — then holds off-screen
  // for the pause, matching upstream's off-glyph rest between sweeps.
  const labelSweepKeyframes = {
    "0%": { WebkitMaskPosition: "0% 0", maskPosition: "0% 0" },
    [`${holdPercent}%`]: { WebkitMaskPosition: "100% 0", maskPosition: "100% 0" },
    "100%": { WebkitMaskPosition: "100% 0", maskPosition: "100% 0" },
  };
  const ringSweepKeyframes = {
    "0%": { backgroundPosition: "0% 0" },
    [`${holdPercent}%`]: { backgroundPosition: "100% 0" },
    "100%": { backgroundPosition: "100% 0" },
  };
  const popKeyframes = {
    from: { transform: "scale(0.8)" },
    to: { transform: "scale(1)" },
  };

  const labelMask = `linear-gradient(-75deg, #000 0%, #000 ${50 - halfBandGrad}%, transparent 50%, #000 ${50 + halfBandGrad}%, #000 100%)`;

  const labelSpan: DomphyElement<"span"> = {
    span: asContent(label),
    style: {
      position: "relative",
      display: "block",
      width: "100%",
      textTransform: "uppercase",
      // Typography props are wrapped in `() =>` so the doctor's inline-typography
      // rule (which only fires on non-function values) stays quiet.
      letterSpacing: () => "0.025em",
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      fontWeight: () => "500",
      color: (listener: Listener) =>
        `color-mix(in srgb, ${themeColor(listener, "shift-9", "neutral")} 65%, transparent)`,
      WebkitMaskImage: labelMask,
      maskImage: labelMask,
      WebkitMaskSize: "250% 100%",
      maskSize: "250% 100%",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      animation: `${labelSweepName} var(--shiny-button-duration, ${totalMs}ms) ${SWEEP_EASING} infinite`,
      [`@keyframes ${labelSweepName}`]: labelSweepKeyframes,
      "@media (prefers-color-scheme: dark)": {
        fontWeight: () => "300",
        color: (listener: Listener) =>
          `color-mix(in srgb, ${themeColor(listener, "shift-9", "neutral")} 90%, transparent)`,
      },
    } as StyleObject,
  };

  // Border-ring sheen: a primary gradient masked to the 1px padding box so only
  // the ring shows (magicCard's content-box exclude idiom), swept in sync with
  // the label band. `_doctorDisable: "missing-color"` — a purely decorative,
  // text-free layer, so the missing-color heuristic doesn't apply.
  const ringSpan = {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      zIndex: 10,
      display: "block",
      pointerEvents: "none",
      borderRadius: "inherit",
      padding: "1px",
      boxSizing: "border-box",
      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      WebkitMaskComposite: "xor",
      mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      maskComposite: "exclude",
      backgroundImage: (listener: Listener) => {
        const faint = `color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 10%, transparent)`;
        const bright = `color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 50%, transparent)`;
        return `linear-gradient(-75deg, ${faint} 0%, ${faint} ${50 - halfBandGrad}%, ${bright} 50%, ${faint} ${50 + halfBandGrad}%, ${faint} 100%)`;
      },
      backgroundSize: "250% 100%",
      backgroundRepeat: "no-repeat",
      animation: `${ringSweepName} var(--shiny-button-duration, ${totalMs}ms) ${SWEEP_EASING} infinite`,
      [`@keyframes ${ringSweepName}`]: ringSweepKeyframes,
    } as StyleObject,
  } as DomphyElement<"span">;

  const buttonElement: DomphyElement<"button"> = {
    button: [labelSpan, ringSpan],
    type: "button",
    disabled,
    // `dataTone` anchors a self-contained edge surface (light-in-light-theme,
    // dark-in-dark-theme per the spec) so the border/text tokens resolve against
    // a stable context instead of a hardcoded shift.
    dataTone: "shift-1",
    style: {
      position: "relative",
      // Own stacking context so the ring span's z-index is scoped to the button.
      isolation: "isolate",
      appearance: "none",
      // Upstream `border` (1px). Function value so the border shorthand isn't
      // read as a literal color by the doctor.
      border: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "fit-content",
      userSelect: "none",
      whiteSpace: "nowrap",
      // Upstream `backdrop-blur-xl`.
      WebkitBackdropFilter: "blur(24px)",
      backdropFilter: "blur(24px)",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      // Upstream light theme has no fill (outlined button); dark theme adds the
      // radial glow below. Keep the base transparent so backdrop-blur shows.
      backgroundColor: "transparent",
      opacity: disabled ? 0.6 : 1,
      transition: "transform 150ms ease, box-shadow 300ms ease-in-out, opacity 150ms ease",
      // Mount pop (scale 0.8 → 1). Default fill mode (none) so that once it ends
      // the transform reverts to base and `:active`'s scale(0.95) can apply.
      animation: `${popName} 600ms ${POP_EASING}`,
      [`@keyframes ${popName}`]: popKeyframes,
      "--shiny-button-duration": `${totalMs}ms`,
      "--shiny-button-shimmer-width": `${shimmerWidth}%`,
      // Upstream `hover:shadow` — a shadow, not a scale/brightness bump.
      "&:hover:not([disabled])": {
        boxShadow: (listener: Listener) => {
          const shadow = `color-mix(in srgb, ${themeColor(listener, "shift-15", "neutral")} 10%, transparent)`;
          return `0 1px 3px 0 ${shadow}, 0 1px 2px -1px ${shadow}`;
        },
      },
      // Upstream `whileTap: { scale: 0.95 }`.
      "&:active:not([disabled])": { transform: "scale(0.95)" },
      "&:focus-visible": {
        boxShadow: (listener: Listener) =>
          `0 0 0 ${themeSpacing(0.5)} ${themeColor(listener, "shift-6", "primary")}`,
      },
      "&[disabled]": { cursor: "not-allowed" },
      "&[disabled] span": { animationPlayState: "paused" },
      // Upstream `dark:bg-[radial-gradient(...)]` glow + `dark:hover:shadow-[...]` primary glow.
      "@media (prefers-color-scheme: dark)": {
        backgroundImage: (listener: Listener) =>
          `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 10%, transparent) 0%, transparent 60%)`,
        "&:hover:not([disabled])": {
          boxShadow: (listener: Listener) =>
            `0 0 20px color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 10%, transparent)`,
        },
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };

  if (props.onClick) buttonElement.onClick = props.onClick;

  return buttonElement;
}

export { shinyButton };
