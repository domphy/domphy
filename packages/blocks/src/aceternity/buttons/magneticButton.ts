// Aceternity UI "Magnetic Button" — clean-room reimplementation.
//
// A generic wrapper that makes its child element softly drift toward the
// cursor while hovering, then springs back to rest on pointer-leave.
// Implemented purely from the block's public functional/visual spec — no
// upstream Aceternity source was viewed or copied.
//
// The wrapper owns no visual chrome of its own — it only tracks the pointer
// and drives a `transform: translate()` on its single child via a spring
// simulation (a critically-underdamped mass/spring/damper stepped every
// animation frame), which is what produces the "overshoot and settle" feel
// on release rather than an instant snap. `pointermove` is listened on the
// wrapper itself (not `window`), so the effect is confined to when the
// cursor is over/near the wrapped child's own box, matching the spec's
// "while the pointer is within/near the button's bounding box" behavior.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface MagneticButtonProps {
  /** The element to wrap (any button/link/interactive node). Defaults to a demo pill CTA button. */
  children?: DomphyElement | DomphyElement[];
  /** 0-1 float: how strongly the child chases the cursor (1 = tracks 1:1). Defaults to `0.8`. */
  strength?: number;
  /** Maximum drift distance, in px. Defaults to `100`. */
  maxDistance?: number;
  className?: string;
  style?: StyleObject;
}

/** Default demo child: a solid, fully-rounded "Follow @mannupaaji" pill CTA, matching the
 * reference demo's lone visible element. Anchored to a fixed dark-blue edge tone (`shift-15`,
 * `"primary"` family — the darkest step of the primary ramp) so it reads as a solid, saturated
 * blue regardless of the surrounding page tone, per the `dataTone-surface-contract`/
 * `middle-surface-anchor` doctor rules (edge anchors only, both `backgroundColor` and `color`
 * set on the anchoring element itself). */
function defaultMagneticChild(): DomphyElement<"button"> {
  return {
    button: [{ strong: "Follow @mannupaaji", $: [strong({ color: "primary" })] }],
    type: "button",
    dataTone: "shift-15",
    style: {
      appearance: "none",
      border: "none",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      // A radius far beyond any realistic box half-height forces a full pill shape — the
      // browser clamps it to the shape's own geometry (not tracked by the raw-spacing-value
      // doctor rule, which only checks margin/padding/gap props).
      borderRadius: "999px",
      backgroundColor: (listener) => themeColor(listener, "inherit", "primary"),
      color: (listener) => themeColor(listener, "shift-9", "primary"),
    } as StyleObject,
  };
}

function asChildren(value: DomphyElement | DomphyElement[]): DomphyElement[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Wraps a single child (typically a button/link) so it softly drifts toward the
 * cursor on hover and springs back to rest on pointer-leave — a "magnetic"
 * attraction effect. The wrapper contributes no styling of its own beyond
 * positioning; all visual chrome comes from the wrapped child. Call with no
 * arguments for a working demo — a solid pill CTA button.
 */
function magneticButton(props: MagneticButtonProps = {}): DomphyElement<"div"> {
  const children = asChildren(props.children ?? defaultMagneticChild());
  const strength = Math.max(0, Math.min(1, props.strength ?? 0.8));
  const maxDistance = props.maxDistance ?? 100;

  return {
    div: children,
    class: props.className,
    style: {
      display: "inline-block",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node) => {
      const wrapper = node.domElement as HTMLElement | null;
      const target = wrapper?.firstElementChild as HTMLElement | null;
      if (!wrapper || !target) return;

      // Spring simulation state: current position/velocity, and the target offset
      // the pointer is currently pulling toward (reset to origin on pointer-leave).
      let positionX = 0;
      let positionY = 0;
      let velocityX = 0;
      let velocityY = 0;
      let targetOffsetX = 0;
      let targetOffsetY = 0;
      let animationFrame = 0;

      // Critically-underdamped spring constants tuned for a small, quick
      // overshoot-and-settle rather than a slow wobble or an instant snap.
      const stiffness = 0.22;
      const damping = 0.72;
      const restEpsilon = 0.02;

      const step = () => {
        const forceX = (targetOffsetX - positionX) * stiffness;
        const forceY = (targetOffsetY - positionY) * stiffness;
        velocityX = (velocityX + forceX) * damping;
        velocityY = (velocityY + forceY) * damping;
        positionX += velocityX;
        positionY += velocityY;
        target.style.transform = `translate(${positionX.toFixed(2)}px, ${positionY.toFixed(2)}px)`;

        const settled =
          Math.abs(velocityX) < restEpsilon &&
          Math.abs(velocityY) < restEpsilon &&
          Math.abs(targetOffsetX - positionX) < restEpsilon &&
          Math.abs(targetOffsetY - positionY) < restEpsilon;
        if (settled) {
          positionX = targetOffsetX;
          positionY = targetOffsetY;
          target.style.transform = `translate(${positionX}px, ${positionY}px)`;
          animationFrame = 0;
          return;
        }
        animationFrame = requestAnimationFrame(step);
      };

      const ensureRunning = () => {
        if (!animationFrame) animationFrame = requestAnimationFrame(step);
      };

      const onPointerMove = (event: PointerEvent) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let offsetX = (event.clientX - centerX) * strength;
        let offsetY = (event.clientY - centerY) * strength;
        const distance = Math.hypot(offsetX, offsetY);
        if (distance > maxDistance && distance > 0) {
          const scale = maxDistance / distance;
          offsetX *= scale;
          offsetY *= scale;
        }
        targetOffsetX = offsetX;
        targetOffsetY = offsetY;
        ensureRunning();
      };

      const onPointerLeave = () => {
        targetOffsetX = 0;
        targetOffsetY = 0;
        ensureRunning();
      };

      wrapper.addEventListener("pointermove", onPointerMove);
      wrapper.addEventListener("pointerleave", onPointerLeave);

      node.addHook("Remove", () => {
        wrapper.removeEventListener("pointermove", onPointerMove);
        wrapper.removeEventListener("pointerleave", onPointerLeave);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        target.style.transform = "";
      });
    },
  };
}

export { magneticButton };
