// magicui "Pointer" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A hover
// zone that hides the native OS cursor and replaces it with a small,
// freely-swappable visual (a shape, emoji, or icon) that tracks the mouse in
// real time while it's inside the zone, fading/scaling in on enter and out
// on leave. Position tracking is done imperatively (direct DOM writes on
// every mousemove/rAF tick) rather than through reactive state, since it is
// a high-frequency, purely visual concern — the same tradeoff other
// lifecycle-hook-driven patches in this file make for canvas refs and
// third-party integrations.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { paragraph, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface PointerOffset {
  x: number;
  y: number;
}

export interface PointerProps {
  /** Custom cursor visual — freely swappable SVG/emoji/element. Defaults to a small pulsing two-tone ring. */
  children?: DomphyElement;
  /** The page content the hover zone wraps. Defaults to a short instructional demo panel. */
  content?: DomphyElement[];
  /** Offset (raw pixels) between the real pointer tip and the custom cursor's anchor point. Defaults to `{ x: 16, y: 16 }`. */
  offset?: PointerOffset;
  /** Smooths motion with a per-frame lerp instead of snapping directly to the pointer. Defaults to `true`. */
  smooth?: boolean;
  /** Lerp factor (0–1) used when `smooth` is true — higher tracks faster/snappier. Defaults to `0.25`. */
  smoothing?: number;
  style?: StyleObject;
}

const DEFAULT_OFFSET: PointerOffset = { x: 16, y: 16 };

const GLYPH_LOOP_KEYFRAMES = {
  "0%,100%": { transform: "scale(1) rotate(0deg)" },
  "50%": { transform: "scale(1.15) rotate(6deg)" },
};
const GLYPH_LOOP_ANIMATION_NAME = `pointer-glyph-loop-${hashString(JSON.stringify(GLYPH_LOOP_KEYFRAMES))}`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Default cursor visual: a two-tone ring (primary outline, surface-colored center) with a
 * continuous, independent scale/rotate loop — demonstrates that intrinsic decoration can run
 * on top of position tracking regardless of what the caller supplies via `children`. */
function defaultCursorGlyph(): DomphyElement<"span"> {
  return {
    span: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      display: "block",
      boxSizing: "border-box",
      width: themeSpacing(6),
      height: themeSpacing(6),
      borderRadius: "50%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      border: (listener: Listener) => `${themeSpacing(1.5)} solid ${themeColor(listener, "shift-9", "primary")}`,
      animation: `${GLYPH_LOOP_ANIMATION_NAME} 1.1s ease-in-out infinite`,
      [`@keyframes ${GLYPH_LOOP_ANIMATION_NAME}`]: GLYPH_LOOP_KEYFRAMES,
    },
  } as DomphyElement<"span">;
}

function defaultContent(): DomphyElement[] {
  return [
    {
      div: [
        { strong: "Hover to preview", $: [strong()] },
        {
          p: "This zone hides the native cursor and tracks a custom visual while your pointer is inside it.",
          $: [paragraph()],
        },
      ],
      style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(2),
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        height: "100%",
        paddingBlock: themeSpacing(12),
        paddingInline: themeSpacing(6),
      },
    },
  ];
}

/**
 * Hover zone that swaps the native OS cursor for a custom tracking visual.
 * Call with no arguments for a working demo — an instructional panel with a
 * pulsing two-tone ring cursor that follows the mouse while hovering.
 */
function pointer(props: PointerProps = {}): DomphyElement<"div"> {
  const offset = props.offset ?? DEFAULT_OFFSET;
  const smooth = props.smooth ?? true;
  const smoothing = clamp(props.smoothing ?? 0.25, 0.01, 1);
  const glyph = props.children ?? defaultCursorGlyph();
  const content = props.content ?? defaultContent();

  const cursorElement: DomphyElement<"div"> = {
    div: [glyph],
    dataPointerCursor: "true",
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      pointerEvents: "none",
      zIndex: 50,
      opacity: 0,
      transform: "translate(-9999px, -9999px) scale(0.5)",
      transition: "opacity 150ms ease-out, transform 150ms ease-out",
      willChange: "transform, opacity",
    },
    // Mounted on the cursor element itself (not the outer container): a
    // parent's `_onMount` fires before its children are attached to the DOM
    // (see ElementNode.render — Mount fires, then children render), so
    // querying for this element from the container's own `_onMount` would
    // find nothing yet. By the time THIS node mounts, its `parentElement` is
    // already the live, attached container.
    _onMount: (node: ElementNode) => {
      const cursor = node.domElement as HTMLElement;
      const container = cursor.parentElement;
      if (!container) return;

      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let active = false;
      let frameHandle: number | null = null;

      const applyTransform = (x: number, y: number, scale: number) => {
        cursor.style.transform = `translate(${x + offset.x}px, ${y + offset.y}px) scale(${scale})`;
      };

      const tick = () => {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the
        // framework's removal lifecycle) never fire the "Remove" hook below.
        // Once the cursor element is detached, the native mouseenter/
        // mouseleave events that would otherwise flip `active` back to
        // `false` can never fire again either, so bailing here is what
        // actually stops the loop from leaking forever.
        if (!cursor.isConnected) {
          frameHandle = null;
          return;
        }
        currentX += (targetX - currentX) * smoothing;
        currentY += (targetY - currentY) * smoothing;
        applyTransform(currentX, currentY, 1);
        if (active) frameHandle = requestAnimationFrame(tick);
        else frameHandle = null;
      };

      const positionFromEvent = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      };

      const handleMove = (event: MouseEvent) => {
        const point = positionFromEvent(event);
        targetX = point.x;
        targetY = point.y;
        if (!smooth) {
          currentX = targetX;
          currentY = targetY;
          applyTransform(currentX, currentY, 1);
        }
      };

      const handleEnter = (event: MouseEvent) => {
        const point = positionFromEvent(event);
        currentX = targetX = point.x;
        currentY = targetY = point.y;
        applyTransform(currentX, currentY, 1);
        cursor.style.opacity = "1";
        active = true;
        if (smooth && frameHandle === null) frameHandle = requestAnimationFrame(tick);
      };

      const handleLeave = () => {
        cursor.style.opacity = "0";
        active = false;
        if (frameHandle !== null) {
          cancelAnimationFrame(frameHandle);
          frameHandle = null;
        }
      };

      container.addEventListener("mousemove", handleMove);
      container.addEventListener("mouseenter", handleEnter);
      container.addEventListener("mouseleave", handleLeave);

      node.addHook("Remove", () => {
        container.removeEventListener("mousemove", handleMove);
        container.removeEventListener("mouseenter", handleEnter);
        container.removeEventListener("mouseleave", handleLeave);
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      });
    },
  };

  return {
    div: [...content, cursorElement],
    style: {
      position: "relative",
      overflow: "hidden",
      cursor: "none",
      ...(props.style ?? {}),
    },
  };
}

export { pointer };
