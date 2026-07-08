// magicui "Pointer" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A hover
// zone that hides the native OS cursor and replaces it with a small,
// freely-swappable visual (a shape, emoji, or icon) that tracks the mouse in
// real time while it's inside the zone, scaling+fading in on enter and
// shrinking+fading out on leave. Position tracking is done imperatively
// (direct DOM writes on every mousemove) rather than through reactive state,
// since it is a high-frequency, purely visual concern — the same tradeoff
// other lifecycle-hook-driven patches in this file make for canvas refs and
// third-party integrations. Position snaps 1:1 to the pointer (no smoothing):
// upstream binds top/left straight to the raw pointer coords via a Framer
// motion value, which has no spring on it.

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
  /** Offset (raw pixels) between the real pointer tip and the custom cursor's anchor point. Defaults to `{ x: 0, y: 0 }` (cursor centered directly on the pointer). */
  offset?: PointerOffset;
  style?: StyleObject;
}

const DEFAULT_OFFSET: PointerOffset = { x: 0, y: 0 };

const GLYPH_LOOP_KEYFRAMES = {
  "0%,100%": { transform: "scale(1) rotate(0deg)" },
  "50%": { transform: "scale(1.15) rotate(6deg)" },
};
const GLYPH_LOOP_ANIMATION_NAME = `pointer-glyph-loop-${hashString(JSON.stringify(GLYPH_LOOP_KEYFRAMES))}`;

// translate(-50%,-50%) centers the glyph on the pointer coords (which live in
// top/left); the scale factor is the only part that changes, so a `transition`
// on `transform` tweens the scale pop-in/pop-out without ever tweening
// position — top/left carry no transition and therefore snap instantly.
const SCALE_IN = "translate(-50%, -50%) scale(1)";
const SCALE_OUT = "translate(-50%, -50%) scale(0)";

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
  const glyph = props.children ?? defaultCursorGlyph();
  const content = props.content ?? defaultContent();

  const cursorElement: DomphyElement<"div"> = {
    div: [glyph],
    dataPointerCursor: "true",
    ariaHidden: "true",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      pointerEvents: "none",
      zIndex: 50,
      opacity: 0,
      // Starts collapsed at scale 0 (not off-screen): the first mouseenter
      // snaps top/left to the pointer instantly and lets scale/opacity tween
      // up from here — so there is no diagonal fly-in from off-screen.
      transform: SCALE_OUT,
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

      // Snap top/left straight to the raw pointer coords (container-relative),
      // no smoothing — mirrors upstream's motion-value binding, which has no
      // spring. top/left carry no CSS transition, so this is instantaneous.
      const place = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        cursor.style.left = `${event.clientX - rect.left + offset.x}px`;
        cursor.style.top = `${event.clientY - rect.top + offset.y}px`;
      };

      // mousemove and mouseenter are identical upstream (set coords + activate).
      // Positioning first (instant) then flipping to the shown state makes the
      // scale pop-in play in place; because `hide` returns scale to 0, every
      // fresh enter re-pops from 0 rather than only the first one.
      const show = (event: MouseEvent) => {
        place(event);
        cursor.style.opacity = "1";
        cursor.style.transform = SCALE_IN;
      };

      const hide = () => {
        cursor.style.opacity = "0";
        cursor.style.transform = SCALE_OUT;
      };

      container.addEventListener("mousemove", show);
      container.addEventListener("mouseenter", show);
      container.addEventListener("mouseleave", hide);

      node.addHook("Remove", () => {
        container.removeEventListener("mousemove", show);
        container.removeEventListener("mouseenter", show);
        container.removeEventListener("mouseleave", hide);
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
