// Aceternity UI "Glowing Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). An
// interactive border-glow overlay for a card: a thin illuminated arc that
// orbits the card's edge, tracking the pointer's angle relative to the
// card's center, only activating within a proximity radius and outside a
// central dead zone.
//
// The ring itself reuses `magicCard()`'s own `content-box`/`border-box`
// `mask` XOR trick already established in this package — a `padding`-sized
// gap between the two mask layers exposes only a border-width ring of the
// glow layer's `conic-gradient`. What's different here is the gradient
// itself: instead of a radial spotlight following the raw cursor position,
// a `conic-gradient(from <angle> at 50% 50%, ...)` sweeps a bright arc
// around the ring, and `<angle>` is the direction from the card's center to
// the pointer — not the cursor's literal (x, y). A single `document`-level
// `pointermove` listener (per spec, shared pointer state so many
// glow-wrapped cards can each react to the one global position) recomputes
// each instance's angle/proximity/dead-zone gating on every animation
// frame; the displayed angle chases the raw target with a manual circular
// lerp (shortest angular path, wrapping through 0/360) each
// `requestAnimationFrame` tick rather than a snap, giving the "trails and
// catches up" easing the spec calls for — plain CSS can't `transition` a
// custom property's angle without the `@property` Houdini at-rule, which
// this codebase's CSS-in-JS layer has no support for, so the easing is done
// in JS instead (see `fidelityNotes`).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GlowingEffectProps {
  /** `"default"` sweeps a multi-color arc; `"white"` is a monochrome neutral glow. Defaults to `"default"`. */
  variant?: "default" | "white";
  /** Theme color roles cycled across the multi-color arc, `"default"` variant only.
   * Defaults to `["info", "primary", "secondary"]`. */
  colors?: ThemeColor[];
  /** Blur radius applied to the glow ring, in px. Defaults to `8`. */
  blur?: number;
  /** Central dead-zone size as a fraction (0–1) of the card's own half-diagonal —
   * pointer positions inside this radius from center never trigger the glow, even
   * directly over the card's middle. Defaults to `0.6`. */
  inactiveZone?: number;
  /** How far outside the card's edge (in px) the effect still triggers. Defaults to `80`. */
  proximity?: number;
  /** Angular width of the bright arc, in degrees. Defaults to `90`. */
  spread?: number;
  /** Ring thickness, in `themeSpacing` units. Defaults to `1`. */
  borderWidth?: number;
  /** Forces the glow to show at a fixed angle without any pointer tracking. Defaults to `false`. */
  alwaysOn?: boolean;
  /** Turns off all pointer interactivity — the ring renders but never lights up (unless `alwaysOn`).
   * The reference component defaults this to `true`; this factory defaults it to `false` instead so
   * calling it with no arguments still demonstrates the effect (see `fidelityNotes`). */
  disabled?: boolean;
  /** Corner radius, in `themeSpacing` units. Defaults to `4`. */
  borderRadius?: number;
  /** Card content wrapped by the glow. Defaults to a small demo card body. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

/** Shortest-path circular lerp toward `target` (degrees), wrapping through 0/360. */
function lerpAngle(current: number, target: number, factor: number): number {
  let delta = ((target - current + 540) % 360) - 180;
  return current + delta * factor;
}

/** Distance (px) from `(pointX, pointY)` to the nearest edge of `rect`; `0` when the point is inside. */
function distanceToRect(pointX: number, pointY: number, rect: DOMRect): number {
  const clampedX = Math.max(rect.left, Math.min(pointX, rect.right));
  const clampedY = Math.max(rect.top, Math.min(pointY, rect.bottom));
  return Math.hypot(pointX - clampedX, pointY - clampedY);
}

function defaultGlowingContent(): DomphyElement[] {
  return [
    { h3: "Glowing Effect", $: [heading()] } as DomphyElement,
    {
      p: "Move your cursor near this card — a soft light arc orbits its border, tracking the pointer's angle.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

/**
 * A border-hugging glow ring that orbits a card's edge, tracking the angle
 * from the card's center to the pointer, gated by a proximity radius and a
 * central dead zone. Call with no arguments for a working demo card — move
 * the pointer near it to see the arc track.
 */
function glowingEffect(props: GlowingEffectProps = {}): DomphyElement<"div"> {
  const variant = props.variant ?? "default";
  const colors = props.colors && props.colors.length > 0 ? props.colors : (["info", "primary", "secondary"] as ThemeColor[]);
  const blur = props.blur ?? 8;
  const inactiveZone = props.inactiveZone ?? 0.6;
  const proximity = props.proximity ?? 80;
  const spread = props.spread ?? 90;
  const borderWidth = props.borderWidth ?? 1;
  const alwaysOn = props.alwaysOn ?? false;
  const disabled = props.disabled ?? false;
  const borderRadius = props.borderRadius ?? 4;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultGlowingContent();

  const arcStops =
    variant === "white"
      ? (["neutral", "neutral", "neutral"] as ThemeColor[])
      : [colors[0], colors[1 % colors.length], colors[2 % colors.length]];

  const glowLayer: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative border-glow ring with no text of its own — exempt from the
    // missing-color contract (mirrors magicCard.ts's own border-glow layer).
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      const glowElement = node.domElement as HTMLElement;
      const wrapperElement = glowElement.parentElement as HTMLElement | null;
      if (!wrapperElement || typeof window === "undefined") return;
      if (disabled && !alwaysOn) return;

      let displayedAngle = 0;
      let targetAngle = 0;
      let targetOpacity = alwaysOn ? 1 : 0;
      let displayedOpacity = alwaysOn ? 1 : 0;
      let animationFrameId: number | null = null;

      function paint(): void {
        glowElement.style.setProperty("--glowing-effect-angle", `${displayedAngle}deg`);
        glowElement.style.opacity = String(displayedOpacity);
      }
      paint();

      function step(): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below. Bailing here
        // once the node is detached prevents the document-level `pointermove`
        // listener from resurrecting this loop forever on every later mouse move.
        if (!glowElement.isConnected) return;
        displayedAngle = lerpAngle(displayedAngle, targetAngle, 0.15);
        displayedOpacity += (targetOpacity - displayedOpacity) * 0.15;
        paint();
        const settled = Math.abs(displayedOpacity - targetOpacity) < 0.01 && Math.abs(((targetAngle - displayedAngle + 540) % 360) - 180) < 0.5;
        animationFrameId = settled ? null : window.requestAnimationFrame(step);
      }
      function ensureLoopRunning(): void {
        if (animationFrameId === null) animationFrameId = window.requestAnimationFrame(step);
      }

      let removePointerListener: (() => void) | null = null;
      if (!alwaysOn) {
        const onPointerMove = (event: PointerEvent) => {
          const rect = wrapperElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const deltaX = event.clientX - centerX;
          const deltaY = event.clientY - centerY;
          const distanceFromCenter = Math.hypot(deltaX, deltaY);
          const halfDiagonal = Math.hypot(rect.width / 2, rect.height / 2);
          const edgeDistance = distanceToRect(event.clientX, event.clientY, rect);

          const withinProximity = edgeDistance <= proximity;
          const inDeadZone = distanceFromCenter < halfDiagonal * inactiveZone;
          const active = withinProximity && !inDeadZone;

          targetOpacity = active ? 1 : 0;
          if (active) {
            targetAngle = ((Math.atan2(deltaY, deltaX) * 180) / Math.PI + 90 + 360) % 360;
          }
          ensureLoopRunning();
        };
        document.addEventListener("pointermove", onPointerMove, { passive: true });
        removePointerListener = () => document.removeEventListener("pointermove", onPointerMove);
      }

      node.addHook("Remove", () => {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
        removePointerListener?.();
      });
    },
    style: {
      position: "absolute",
      inset: 0,
      padding: themeSpacing(borderWidth),
      boxSizing: "border-box",
      borderRadius: themeSpacing(borderRadius),
      opacity: alwaysOn ? 1 : 0,
      pointerEvents: "none",
      filter: `blur(${blur}px)`,
      backgroundImage: (listener) =>
        `conic-gradient(from var(--glowing-effect-angle, 0deg) at 50% 50%, transparent 0deg, ${themeColor(listener, "shift-11", arcStops[0])} ${spread * 0.5}deg, ${themeColor(listener, "shift-9", arcStops[1])} ${spread}deg, ${themeColor(listener, "shift-11", arcStops[2])} ${spread * 1.5}deg, transparent ${spread * 2}deg, transparent 360deg)`,
      WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      WebkitMaskComposite: "xor",
      mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
      maskComposite: "exclude",
      transition: "opacity 200ms ease",
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      glowLayer,
      {
        div: contentChildren,
        style: { position: "relative", zIndex: 1, padding: themeSpacing(6) } as StyleObject,
      } as DomphyElement,
    ],
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(borderRadius),
      backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener) => themeColor(listener, "shift-10", "neutral"),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { glowingEffect };
