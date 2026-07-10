// Magic UI "Magic Card" — Domphy reimplementation of the upstream React
// component (registry/magicui/magic-card.tsx).
//
// An interactive card with two visual modes:
//
//   "border" (upstream `mode: "gradient"`) — a gradient ring that lives on the
//   card border AT ALL TIMES (running glow → glow → the neutral border colour
//   at 100%, so the edge stays fully coloured and the cursor only moves the
//   bright spotlight region), PLUS a soft interior radial glow that fades in
//   over 300ms on hover and tracks the pointer.
//
//   "orb" — a large blurred circular blob whose position is spring-smoothed so
//   it eases and LAGS toward the cursor rather than snapping, whose visibility
//   fades in/out through a second spring, and which blends into the content via
//   mix-blend-mode (screen on dark surfaces, multiply on light) inside the
//   card's own `isolate` stacking context.
//
// Pointer tracking writes the raw cursor position to the `--magic-card-x/-y`
// custom properties on the host (the border spotlight reads them directly);
// the orb springs are integrated on a rAF loop (the same spring-damper the
// package's smoothCursor uses). Window `pointerout`/`blur` and document
// `visibilitychange` reset the glow when the pointer leaves the window or the
// tab is hidden, matching upstream's global reset handlers.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";

export interface MagicCardProps {
  /** `"border"` keeps a gradient ring on the edge and adds a soft interior glow that tracks the cursor; `"orb"` is a larger blurred blob that spring-lags behind the pointer and blends into the content. Defaults to `"border"`. */
  variant?: "border" | "orb";
  /** Spotlight/ring diameter in pixels, `"border"` mode only. Defaults to `200`. */
  spotlightSize?: number;
  /** Orb diameter in pixels, `"orb"` mode only. Defaults to `420`. */
  orbSize?: number;
  /** Orb blur radius in pixels, `"orb"` mode only. Defaults to `60`. */
  orbBlur?: number;
  /** Orb opacity while hovered, `"orb"` mode only. Defaults to `0.9`. */
  orbOpacity?: number;
  /** Glow color. Defaults to `"primary"`. */
  glowColor?: ThemeColor;
  /** Corner radius in pixels. Defaults to `16`. */
  borderRadius?: number;
  /** Card content rendered inside the card. Defaults to a small demo card body. */
  children?: DomphyElement[];
}

// Interior glow opacity while hovered (upstream `gradientOpacity`).
const GRADIENT_OPACITY = 0.8;
// Interior glow fade duration (upstream `duration-300`).
const GRADIENT_FADE_MS = 300;
// Orb blob gradient angle (upstream `glowAngle`); the two colour stops come
// from the glowColor family (single-family theme substitution).
const ORB_ANGLE = 90;
// Orb position spring (upstream useSpring(stiffness 250, damping 30, mass 0.6))
// — the orb eases toward and lags behind the cursor.
const ORB_STIFFNESS = 250;
const ORB_DAMPING = 30;
const ORB_MASS = 0.6;
// Orb visibility spring (upstream useSpring(stiffness 300, damping 35)).
const ORB_VISIBLE_STIFFNESS = 300;
const ORB_VISIBLE_DAMPING = 35;

/**
 * A card whose border/background glow tracks the mouse cursor, fading in on
 * hover and out on leave (or when the pointer leaves the window / the tab is
 * hidden). Call with no arguments for a working demo card.
 */
function magicCard(props: MagicCardProps = {}): DomphyElement<"div"> {
  const {
    variant = "border",
    spotlightSize = 200,
    orbSize = 420,
    orbBlur = 60,
    orbOpacity = 0.9,
    glowColor = "primary",
    borderRadius = 16,
    children = [
      { h3: "Magic Card", $: [heading()] },
      {
        p: "Move your cursor over this card — the glow follows your pointer in real time.",
        $: [paragraph({ color: "neutral" })],
      },
    ],
  } = props;

  let rootElement: HTMLElement | null = null;
  let glowElement: HTMLElement | null = null;
  let removeListeners: (() => void) | null = null;

  // Before any pointer input the spotlight/glow sits off-card (upstream seeds
  // its motion values to -gradientSize), so the border shows only its neutral
  // colour and the interior glow is invisible.
  const offCard = `-${spotlightSize}px`;

  const captureGlow = {
    _onMount: (node: ElementNode) => {
      glowElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      glowElement = null;
    },
  };

  const glowLayer: DomphyElement =
    variant === "orb"
      ? ({
          div: null,
          ...captureGlow,
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: `${orbSize}px`,
            height: `${orbSize}px`,
            borderRadius: "50%",
            pointerEvents: "none",
            opacity: 0,
            filter: `blur(${orbBlur}px)`,
            // JS overrides with translate(x, y) translate(-50%, -50%) each frame;
            // the base keeps the blob centred on its origin before the loop runs.
            transform: "translate(-50%, -50%)",
            willChange: "transform, opacity",
            // Orb blends into the content beneath it: `multiply` darkens on light
            // surfaces, `screen` lightens on dark ones — upstream picks by theme;
            // here the OS color-scheme drives the switch (the package's own idiom,
            // see backgrounds/noiseTexture.ts).
            mixBlendMode: "multiply",
            "@media (prefers-color-scheme: dark)": { mixBlendMode: "screen" },
            // Two-stop gradient at glowAngle (upstream glowFrom → glowTo);
            // both stops are shifts of the glowColor family.
            background: (listener: Listener) =>
              `linear-gradient(${ORB_ANGLE}deg, ${themeColor(listener, "shift-9", glowColor)}, ${themeColor(listener, "shift-6", glowColor)})`,
            // No text is rendered (div: null) — `color` only satisfies doctor's
            // missing-color heuristic for a themed, text-less decorative layer.
            color: (listener: Listener) =>
              themeColor(listener, "shift-9", glowColor),
            zIndex: 1,
          } as StyleObject,
        } as DomphyElement)
      : ({
          div: null,
          ...captureGlow,
          style: {
            position: "absolute",
            // inset-px: cover the interior but not the 1px border ring.
            inset: "1px",
            borderRadius: "inherit",
            pointerEvents: "none",
            opacity: 0,
            transition: `opacity ${GRADIENT_FADE_MS}ms ease`,
            background: (listener: Listener) =>
              `radial-gradient(${spotlightSize}px circle at var(--magic-card-x, ${offCard}) var(--magic-card-y, ${offCard}), ${themeColor(listener, "shift-9", glowColor)}, transparent 100%)`,
            color: (listener: Listener) =>
              themeColor(listener, "shift-9", glowColor),
            zIndex: 1,
          } as StyleObject,
        } as DomphyElement);

  const content: DomphyElement = {
    div: children,
    style: {
      position: "relative",
      zIndex: 2,
      padding: themeSpacing(6),
    },
  } as DomphyElement;

  // ── Border ("gradient") mode: raw pointer tracking + 300ms interior fade ──
  const mountBorder = (node: ElementNode) => {
    rootElement = node.domElement as HTMLElement;
    if (typeof window === "undefined") return;

    const setOff = () => {
      rootElement?.style.setProperty("--magic-card-x", offCard);
      rootElement?.style.setProperty("--magic-card-y", offCard);
    };
    const onMove = (event: MouseEvent) => {
      if (!rootElement) return;
      const rect = rootElement.getBoundingClientRect();
      rootElement.style.setProperty(
        "--magic-card-x",
        `${event.clientX - rect.left}px`,
      );
      rootElement.style.setProperty(
        "--magic-card-y",
        `${event.clientY - rect.top}px`,
      );
      if (glowElement) glowElement.style.opacity = String(GRADIENT_OPACITY);
    };
    // Reset: park the spotlight off-card and fade the interior glow out.
    const hide = () => {
      setOff();
      if (glowElement) glowElement.style.opacity = "0";
    };
    const onGlobalPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) hide();
    };
    const onBlur = () => hide();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") hide();
    };

    setOff();
    rootElement.addEventListener("mousemove", onMove);
    rootElement.addEventListener("mouseleave", hide);
    window.addEventListener("pointerout", onGlobalPointerOut);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    removeListeners = () => {
      rootElement?.removeEventListener("mousemove", onMove);
      rootElement?.removeEventListener("mouseleave", hide);
      window.removeEventListener("pointerout", onGlobalPointerOut);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  };

  // ── Orb mode: spring-smoothed position + spring visibility on a rAF loop ──
  const mountOrb = (node: ElementNode) => {
    rootElement = node.domElement as HTMLElement;
    if (typeof window === "undefined") return;

    let positionX = -spotlightSize;
    let positionY = -spotlightSize;
    let velocityX = 0;
    let velocityY = 0;
    let targetX = -spotlightSize;
    let targetY = -spotlightSize;
    let visible = 0;
    let visibleVelocity = 0;
    let targetVisible = 0;
    let frameHandle: number | null = null;
    let lastTime = 0;

    const apply = () => {
      if (!glowElement) return;
      glowElement.style.transform = `translate(${positionX}px, ${positionY}px) translate(-50%, -50%)`;
      glowElement.style.opacity = String(visible);
    };

    const step = (time: number) => {
      // Stop if the node was torn out without the Remove hook firing.
      if (!rootElement || !rootElement.isConnected) {
        frameHandle = null;
        return;
      }
      // Clamp so a backgrounded tab doesn't produce a huge delta on resume.
      const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;

      // Position spring-damper: the orb eases toward and lags behind the cursor.
      const accelerationX =
        (-ORB_STIFFNESS * (positionX - targetX) - ORB_DAMPING * velocityX) /
        ORB_MASS;
      const accelerationY =
        (-ORB_STIFFNESS * (positionY - targetY) - ORB_DAMPING * velocityY) /
        ORB_MASS;
      velocityX += accelerationX * deltaSeconds;
      velocityY += accelerationY * deltaSeconds;
      positionX += velocityX * deltaSeconds;
      positionY += velocityY * deltaSeconds;

      // Visibility spring (mass 1): fades the orb in on enter, out on leave.
      const visibleAcceleration =
        -ORB_VISIBLE_STIFFNESS * (visible - targetVisible) -
        ORB_VISIBLE_DAMPING * visibleVelocity;
      visibleVelocity += visibleAcceleration * deltaSeconds;
      visible += visibleVelocity * deltaSeconds;

      apply();

      const settled =
        Math.abs(positionX - targetX) < 0.01 &&
        Math.hypot(velocityX, velocityY) < 0.01 &&
        Math.abs(visible - targetVisible) < 0.001 &&
        Math.abs(visibleVelocity) < 0.001;
      frameHandle = settled ? null : requestAnimationFrame(step);
    };

    const ensureLoopRunning = () => {
      if (frameHandle === null) {
        lastTime = performance.now();
        frameHandle = requestAnimationFrame(step);
      }
    };

    const onMove = (event: MouseEvent) => {
      if (!rootElement) return;
      const rect = rootElement.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      // The border spotlight (root background) still tracks the raw pointer in
      // orb mode too — only the orb blob is spring-smoothed.
      rootElement.style.setProperty("--magic-card-x", `${targetX}px`);
      rootElement.style.setProperty("--magic-card-y", `${targetY}px`);
      ensureLoopRunning();
    };
    const onEnter = () => {
      targetVisible = orbOpacity;
      ensureLoopRunning();
    };
    const onLeave = () => {
      targetVisible = 0;
      ensureLoopRunning();
    };
    const onGlobalPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) onLeave();
    };
    const onBlur = () => onLeave();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") onLeave();
    };

    rootElement.addEventListener("mousemove", onMove);
    rootElement.addEventListener("mouseenter", onEnter);
    rootElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("pointerout", onGlobalPointerOut);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);

    removeListeners = () => {
      rootElement?.removeEventListener("mousemove", onMove);
      rootElement?.removeEventListener("mouseenter", onEnter);
      rootElement?.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("pointerout", onGlobalPointerOut);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
    };
  };

  return {
    div: [glowLayer, content],
    _onMount: variant === "orb" ? mountOrb : mountBorder,
    _onRemove: () => {
      removeListeners?.();
      removeListeners = null;
      rootElement = null;
      glowElement = null;
    },
    style: {
      position: "relative",
      // Own stacking context so the orb's mix-blend-mode composites only within
      // the card (upstream root carries `isolate`).
      isolation: "isolate",
      overflow: "hidden",
      boxSizing: "border-box",
      borderRadius: `${borderRadius}px`,
      // Transparent 1px border whose gradient is painted by the border-box layer
      // of `background` below — always on, so the ring stays coloured at rest.
      border: "1px solid transparent",
      color: (listener) => themeColor(listener, "shift-10", "neutral"),
      // padding-box: opaque card surface fills the interior (hiding the ring
      // there); border-box: the spotlight gradient runs glow → glow → the
      // neutral border colour at 100%, so only the border shows it and the
      // cursor merely moves the bright region.
      background: (listener) => {
        const surface = themeColor(listener, "inherit", "neutral");
        const from = themeColor(listener, "shift-9", glowColor);
        const to = themeColor(listener, "shift-6", glowColor);
        const borderTone = themeColor(listener, "shift-3", "neutral");
        return (
          `linear-gradient(${surface} 0 0) padding-box, ` +
          `radial-gradient(${spotlightSize}px circle at var(--magic-card-x, ${offCard}) var(--magic-card-y, ${offCard}), ${from}, ${to}, ${borderTone} 100%) border-box`
        );
      },
    } as StyleObject,
  };
}

export { magicCard };
