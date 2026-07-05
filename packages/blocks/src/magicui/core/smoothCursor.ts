// magicui "Smooth Cursor" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// full-viewport custom cursor that hides the native OS cursor globally and
// trails the real mouse position with spring physics — the visible glyph
// lags slightly behind fast movement and settles with a small overshoot
// rather than snapping or easing linearly, and rotates to lean into the
// current direction of travel.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface SmoothCursorSpring {
  /** How fast oscillation dies out. Defaults to `45`. */
  damping?: number;
  /** How strongly the cursor is pulled toward the target. Defaults to `400`. */
  stiffness?: number;
  /** Perceived weight/inertia. Defaults to `1`. */
  mass?: number;
  /** Distance (px) and speed (px/s) below which motion is considered settled and the rAF loop pauses. Defaults to `0.001`. */
  restDelta?: number;
}

export interface SmoothCursorProps {
  /** Custom cursor graphic — replaces the default arrow glyph. */
  children?: DomphyElement;
  /** Spring tuning. See {@link SmoothCursorSpring}. */
  spring?: SmoothCursorSpring;
  /** Theme color for the default arrow glyph. Defaults to `"neutral"`. */
  color?: ThemeColor;
  style?: StyleObject;
}

const DEFAULT_SPRING: Required<SmoothCursorSpring> = {
  damping: 45,
  stiffness: 400,
  mass: 1,
  restDelta: 0.001,
};

// The movement "squish" uses its own snappier spring, independent of the
// position spring (the reference drives scale with a separate spring). The
// glyph shrinks to SCALE_ACTIVE while the pointer moves and springs back to 1.
const SCALE_ACTIVE = 0.95;
const SCALE_STIFFNESS = 500;
const SCALE_DAMPING = 35;
const SCALE_REST_MS = 150;

/** Default cursor graphic — a simple filled arrow/pointer silhouette, tip pointing up-left
 * so a 0deg rotation reads as "neutral/idle" before any direction-of-travel rotation is applied. */
function defaultCursorGlyph(color: ThemeColor): DomphyElement<"svg"> {
  return {
    svg: [
      {
        polygon: null,
        points: "4,3 4,22 9,17.3 12,23.5 15.3,22 12.2,15.8 20,15.8",
      },
    ],
    viewBox: "0 0 24 26",
    fill: "currentColor",
    role: "presentation",
    ariaHidden: "true",
    style: {
      display: "block",
      width: themeSpacing(7),
      height: themeSpacing(7),
      color: (listener: Listener) => themeColor(listener, "shift-14", color),
    } as StyleObject,
  } as DomphyElement<"svg">;
}

/**
 * Global full-viewport custom cursor driven by spring physics. Call with no
 * arguments for a working demo — a dark arrow glyph that trails the mouse
 * with organic deceleration and direction-of-travel rotation.
 */
function smoothCursor(props: SmoothCursorProps = {}): DomphyElement<"div"> {
  const spring = { ...DEFAULT_SPRING, ...(props.spring ?? {}) };
  const glyph = props.children ?? defaultCursorGlyph(props.color ?? "neutral");

  return {
    div: [glyph],
    ariaHidden: "true",
    dataSmoothCursor: "true",
    style: {
      position: "fixed",
      insetBlockStart: 0,
      insetInlineStart: 0,
      pointerEvents: "none",
      zIndex: 2147483647,
      opacity: 0,
      willChange: "transform",
      transform: "translate(-100px, -100px)",
      ...(props.style ?? {}),
    },
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      const previousCursor = document.body.style.cursor;
      document.body.style.cursor = "none";

      let positionX = 0;
      let positionY = 0;
      let velocityX = 0;
      let velocityY = 0;
      let targetX = 0;
      let targetY = 0;
      let angle = 0;
      let hasPosition = false;
      let frameHandle: number | null = null;
      let lastTime = 0;
      let scale = 1;
      let scaleVelocity = 0;
      let targetScale = 1;
      let lastMoveTime = 0;

      const applyTransform = () => {
        // translate(-50%, -50%) centers the glyph on the pointer (the reference
        // applies the same -50%/-50% offset); scale() applies the movement squish.
        element.style.transform = `translate(${positionX}px, ${positionY}px) translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;
      };

      const step = (time: number) => {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the
        // framework's removal lifecycle) never fire the "Remove" hook below.
        // The `mousemove` listener here is attached to `window`, not this
        // element, so it keeps firing (and would keep restarting the loop
        // via `ensureLoopRunning`) even after the cursor is detached —
        // bailing here once `element.isConnected` is false is what actually
        // stops the loop from leaking forever.
        if (!element.isConnected) {
          frameHandle = null;
          return;
        }
        // Clamp so a stalled/backgrounded tab doesn't produce a huge delta on resume.
        const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
        lastTime = time;

        // Spring-damper: force = -stiffness * displacement - damping * velocity.
        const accelerationX = (-spring.stiffness * (positionX - targetX) - spring.damping * velocityX) / spring.mass;
        const accelerationY = (-spring.stiffness * (positionY - targetY) - spring.damping * velocityY) / spring.mass;

        velocityX += accelerationX * deltaSeconds;
        velocityY += accelerationY * deltaSeconds;
        const previousX = positionX;
        const previousY = positionY;
        positionX += velocityX * deltaSeconds;
        positionY += velocityY * deltaSeconds;

        const travelDistance = Math.hypot(positionX - previousX, positionY - previousY);
        if (travelDistance > 0.05) {
          angle = (Math.atan2(positionY - previousY, positionX - previousX) * 180) / Math.PI + 90;
        }

        // Release the squish once the pointer has been idle past the rest window.
        if (time - lastMoveTime > SCALE_REST_MS) targetScale = 1;
        const scaleAcceleration =
          (-SCALE_STIFFNESS * (scale - targetScale) - SCALE_DAMPING * scaleVelocity) / spring.mass;
        scaleVelocity += scaleAcceleration * deltaSeconds;
        scale += scaleVelocity * deltaSeconds;

        applyTransform();

        const settled =
          Math.abs(targetX - positionX) < spring.restDelta &&
          Math.abs(targetY - positionY) < spring.restDelta &&
          Math.hypot(velocityX, velocityY) < spring.restDelta &&
          Math.abs(targetScale - scale) < spring.restDelta &&
          Math.abs(scaleVelocity) < spring.restDelta;

        frameHandle = settled ? null : requestAnimationFrame(step);
      };

      const ensureLoopRunning = () => {
        if (frameHandle === null) {
          lastTime = performance.now();
          frameHandle = requestAnimationFrame(step);
        }
      };

      const handleMove = (event: MouseEvent) => {
        targetX = event.clientX;
        targetY = event.clientY;
        targetScale = SCALE_ACTIVE;
        lastMoveTime = performance.now();
        if (!hasPosition) {
          positionX = targetX;
          positionY = targetY;
          hasPosition = true;
          element.style.opacity = "1";
          applyTransform();
        }
        ensureLoopRunning();
      };

      window.addEventListener("mousemove", handleMove);

      node.addHook("Remove", () => {
        window.removeEventListener("mousemove", handleMove);
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);
        document.body.style.cursor = previousCursor;
      });
    },
  };
}

export { smoothCursor };
