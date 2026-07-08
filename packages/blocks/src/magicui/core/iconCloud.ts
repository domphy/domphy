// magicui "Icon Cloud" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An
// interactive, auto-rotating "tag cloud" sphere of icon chips that the user
// can grab and spin with the mouse or touch, drifting on its own toward
// wherever the pointer rests when not being dragged. Clicking a single icon
// (a press with no drag) animates the whole sphere on an easeOutCubic tween
// so that icon settles at the front-center.
//
// Rendered on a single 2D `<canvas>` (not WebGL/DOM 3D transforms) since the
// point count is small and cheap to project by hand: a fixed set of points is
// pre-distributed evenly over a unit sphere via a golden-angle (Fibonacci)
// spiral — this avoids the pole-clumping a naive latitude/longitude grid
// would produce. Every frame, the points are rotated by the current
// accumulated yaw/pitch — driven directly by drag delta while dragging, or
// (when idle) drifting toward wherever the pointer currently rests: speed
// and direction both derive from the pointer's offset from the canvas
// center, so hovering near an edge spins the sphere faster in that
// direction, matching the reference's own idle behavior (there is no
// separate momentum/coasting phase after a drag ends) — then projected
// orthographically to 2D, sorted back-to-front by depth (painter's
// algorithm) so nearer icons occlude farther ones, and drawn with
// `drawImage` at a size/opacity interpolated from normalized depth. Vector
// glyphs are rasterized once to an offscreen `Image` via a data: URI; bitmap
// image URLs are pre-rendered into a 40x40 offscreen canvas behind a circular
// clip (so avatar/logo art reads as a disc, matching upstream's mask). Either
// way the per-frame draw path is a single `drawImage`, uniform across sources.

import type { DomphyElement, ElementNode } from "@domphy/core";
import { themeColorToken } from "@domphy/theme";

export interface IconCloudItem {
  /** Bitmap image URL. Takes priority over `glyphMarkup` when both are set. */
  image?: string;
  /** Inline `<svg>...</svg>` markup (a plain string, not a Domphy element tree — pre-rendered to
   * an offscreen bitmap once, the same as `image`). Ignored when `image` is set. */
  glyphMarkup?: string;
  /** Accessible label, surfaced via the canvas's `title` attribute on hover and in the textual fallback. */
  label?: string;
}

export interface IconCloudProps {
  /** Icons distributed evenly over the sphere. Defaults to 20 generic hand-authored glyphs. */
  icons?: IconCloudItem[];
  /** Square canvas/container size, in px. Defaults to 400. */
  size?: number;
  /** Idle auto-rotation base angular speed, radians/frame, at rest with the pointer centered.
   * Ramps up as the pointer moves away from the canvas center. Defaults to 0.003. */
  autoRotateSpeed?: number;
  /** Drag sensitivity — radians of rotation per px of pointer movement. Defaults to 0.002. */
  dragSensitivity?: number;
  /** Icon render size range in px, `[nearest, farthest]`. Defaults to `[42, 14]`. */
  iconScaleRange?: [number, number];
  /** Icon opacity range, `[nearest, farthest]`. Defaults to `[1, 0.25]`. */
  iconOpacityRange?: [number, number];
  ariaLabel?: string;
}

const DEFAULT_SIZE = 400;
const DEFAULT_AUTO_ROTATE_SPEED = 0.003;
const DEFAULT_DRAG_SENSITIVITY = 0.002;
// Idle rotation isn't a fixed spin: it's a pointer-relative drift, same as the
// reference — speed ramps from `autoRotateSpeed` (pointer centered) up to
// `autoRotateSpeed + AUTO_ROTATE_HOVER_SPEED_BOOST` (pointer at the corner).
const AUTO_ROTATE_HOVER_SPEED_BOOST = 0.01;
const DEFAULT_ICON_SCALE_RANGE: [number, number] = [42, 14];
const DEFAULT_ICON_OPACITY_RANGE: [number, number] = [1, 0.25];
// Projected sphere radius as a fraction of canvas width. Upstream scales unit
// points by *100 inside a fixed 400px canvas, so the sphere radius is 25% of
// the width and the cloud fills roughly half the frame.
const SPHERE_RADIUS_RATIO = 0.25;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
// Click-to-focus tween: duration scales with the angular distance to travel,
// clamped so a tiny nudge still reads as motion and a half-turn doesn't crawl.
const FOCUS_MIN_DURATION_MS = 800;
const FOCUS_MAX_DURATION_MS = 2000;
const FOCUS_DURATION_PER_RADIAN_MS = 1000;
// A press whose total pointer travel stays under this (px) counts as a click
// (focus an icon); beyond it, the press is a drag (spin the sphere) instead.
const DRAG_CLICK_THRESHOLD_PX = 6;

// Hand-authored, simple geometric glyph shapes (24x24, stroke=currentColor) —
// generic placeholders standing in for "an icon goes here", not tracing any
// real icon set or trademarked logo.
const DEFAULT_GLYPH_INNER_SHAPES: string[] = [
  '<circle cx="12" cy="12" r="8"/>',
  '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  '<polygon points="12,4 20,20 4,20"/>',
  '<polygon points="12,3 21,12 12,21 3,12"/>',
  '<polygon points="12,3 20,8 20,16 12,21 4,16 4,8"/>',
  '<polygon points="12,3 14.6,9.2 21.4,9.4 16,13.6 17.9,20.2 12,16.4 6.1,20.2 8,13.6 2.6,9.4 9.4,9.2"/>',
  '<path d="M12 4v16M4 12h16"/>',
  '<path d="M6 6l12 12M18 6L6 18"/>',
  '<path d="M12 20s-7-4.4-9.5-9C.8 7.3 3 4 6.5 4c2 0 3.4 1 5.5 3 2.1-2 3.5-3 5.5-3 3.5 0 5.7 3.3 4 7-2.5 4.6-9.5 9-9.5 9z"/>',
  '<path d="M7 18a4 4 0 0 1-.6-7.96A5 5 0 0 1 16 8a4 4 0 0 1 1 7.9M7 18h10"/>',
  '<path d="M13 3 4 14h6l-1 7 9-11h-6l1-7z"/>',
  '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  '<path d="M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12z"/>',
  '<path d="M20 4S5 5 5 15a7 7 0 0 0 14 0c0-4-2-8.5 1-11z"/>',
  '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 6.5l2.3 1.6M17.5 15.9l2.3 1.6M2 12h3M19 12h3M4.2 17.5l2.3-1.6M17.5 8.1l2.3-1.6"/>',
  '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  '<path d="M6 3v18M6 4h12l-3 4 3 4H6"/>',
  '<path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M9.5 20a2.5 2.5 0 0 0 5 0"/>',
  '<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
];

function buildGlyphMarkup(innerShape: string, colorHex: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${colorHex}" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${innerShape}</svg>`
  );
}

function defaultIcons(colorHex: string): IconCloudItem[] {
  return DEFAULT_GLYPH_INNER_SHAPES.map((shape) => ({ glyphMarkup: buildGlyphMarkup(shape, colorHex) }));
}

interface SpherePoint {
  x: number;
  y: number;
  z: number;
}

/** Golden-angle (Fibonacci) spiral — distributes `count` points evenly over a unit sphere
 * surface with no pole clumping, cheaper than iterative relaxation for a small fixed set. */
function buildFibonacciSpherePoints(count: number): SpherePoint[] {
  const points: SpherePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const y = count === 1 ? 0 : 1 - (index / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * index;
    points.push({ x: Math.cos(theta) * radiusAtY, y, z: Math.sin(theta) * radiusAtY });
  }
  return points;
}

function rotatePoint(point: SpherePoint, yaw: number, pitch: number): SpherePoint {
  // Matches upstream's projection exactly: yaw (spin about the vertical axis)
  // is applied first and alone determines depth (z), then pitch only slides the
  // point vertically (y) reusing that pre-pitch depth — a deliberately partial,
  // non-orthonormal rotation. Consequences that make it faithful to upstream:
  // vertical drag moves icons up/down WITHOUT changing their depth/scale, and
  // the yaw handedness (sign of the sin terms) matches, so horizontal drag
  // spins the sphere the same direction as the reference.
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const rotatedX = point.x * cosYaw - point.z * sinYaw;
  const rotatedZ = point.x * sinYaw + point.z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const rotatedY = point.y * cosPitch + rotatedZ * sinPitch;
  return { x: rotatedX, y: rotatedY, z: rotatedZ };
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** The absolute yaw/pitch that, applied via `rotatePoint`, bring `point` to the
 * screen center (projected to the canvas center, on the viewer-facing side).
 * Independent of the current rotation — the tween interpolates from wherever the
 * sphere currently sits to these target angles. Uses upstream's exact target
 * formula (yaw = atan2(x, z), pitch = -atan2(y, r_xz)); under the partial
 * rotation the focused point lands at x=0, y=0 with depth r_xz — upstream does
 * not renormalize it to the front pole, so neither do we. */
function focusRotationForPoint(point: SpherePoint): { yaw: number; pitch: number } {
  const radiusInXZ = Math.sqrt(point.x * point.x + point.z * point.z);
  return {
    yaw: Math.atan2(point.x, point.z),
    pitch: -Math.atan2(point.y, radiusInXZ),
  };
}

/**
 * An interactive, auto-rotating sphere of icon chips (2D canvas), drag-to-spin
 * with a pointer-relative idle drift. Call with no arguments for a working
 * demo — 20 generic glyphs auto-rotating, themed from the current context.
 */
function iconCloud(props: IconCloudProps = {}): DomphyElement<"div"> {
  const size = props.size ?? DEFAULT_SIZE;
  const autoRotateSpeed = props.autoRotateSpeed ?? DEFAULT_AUTO_ROTATE_SPEED;
  const dragSensitivity = props.dragSensitivity ?? DEFAULT_DRAG_SENSITIVITY;
  const [nearSize, farSize] = props.iconScaleRange ?? DEFAULT_ICON_SCALE_RANGE;
  const [nearOpacity, farOpacity] = props.iconOpacityRange ?? DEFAULT_ICON_OPACITY_RANGE;

  return {
    div: [],
    role: "img",
    ariaLabel: props.ariaLabel ?? "Interactive rotating cloud of icons — drag to spin",
    style: {
      position: "relative",
      width: `${size}px`,
      height: `${size}px`,
      maxWidth: "100%",
      aspectRatio: "1 / 1",
      marginInline: "auto",
      touchAction: "none",
    },
    _onMount: (node: ElementNode) => {
      const container = node.domElement as HTMLElement | null;
      if (!container || typeof document === "undefined") return;

      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.borderRadius = "0.5rem"; // upstream canvas has rounded-lg corners
      canvas.style.cursor = "grab";
      container.appendChild(canvas);

      const context = canvas.getContext("2d");
      if (!context) return;

      let iconColor = "#5a6472";
      try {
        iconColor = themeColorToken(node, "shift-11", "neutral");
      } catch {
        // Fall back to the default gray above if the theme isn't resolvable yet.
      }
      const icons = props.icons ?? defaultIcons(iconColor);
      const points = buildFibonacciSpherePoints(icons.length);

      interface LoadedIcon {
        // Either the rasterized glyph (a plain <img>) or, for bitmap image URLs,
        // a 40x40 offscreen canvas the source was circular-clipped into. Stays
        // null until the load completes, so its presence is the readiness flag.
        source: CanvasImageSource | null;
      }
      const loaded: LoadedIcon[] = icons.map(() => ({ source: null }));
      icons.forEach((icon, index) => {
        if (icon.image) {
          // Bitmap image URL: load cross-origin (so the canvas stays clean) and
          // pre-render into a 40x40 offscreen canvas behind a circular clip, so
          // avatar/logo art reads as a disc — matching upstream's arc()+clip().
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.decoding = "async";
          image.onload = () => {
            const offscreen = document.createElement("canvas");
            offscreen.width = 40;
            offscreen.height = 40;
            const offContext = offscreen.getContext("2d");
            if (!offContext) return;
            offContext.beginPath();
            offContext.arc(20, 20, 20, 0, Math.PI * 2);
            offContext.closePath();
            offContext.clip();
            offContext.drawImage(image, 0, 0, 40, 40);
            loaded[index].source = offscreen;
          };
          image.src = icon.image;
          return;
        }
        if (!icon.glyphMarkup) return;
        // Vector glyph: rasterize the inline SVG once via a data: URI, drawn
        // unclipped (as upstream renders its SVG icons — no circular mask).
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          loaded[index].source = image;
        };
        image.src = `data:image/svg+xml,${encodeURIComponent(icon.glyphMarkup)}`;
      });

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      interface FocusTarget {
        yaw: number;
        pitch: number;
        startYaw: number;
        startPitch: number;
        startTime: number;
        duration: number;
      }

      let yaw = 0;
      let pitch = 0; // start flat, matching upstream's initial rotation (0, 0)
      // Last-known pointer position in the canvas's own drawing space, used
      // only to drive the idle drift below — starts at the top-left corner
      // (maximum offset from center), matching the reference's own initial
      // state, so the sphere drifts from the very first frame before any
      // pointer input has landed on the canvas at all.
      let pointerCanvasX = 0;
      let pointerCanvasY = 0;
      let dragging = false;
      let lastPointerX = 0;
      let lastPointerY = 0;
      let pointerDownX = 0;
      let pointerDownY = 0;
      let pointerMovedFar = false;
      let focusTarget: FocusTarget | null = null;
      let width = container.clientWidth || size;
      let frameHandle: number | null = null;
      let resizeObserver: ResizeObserver | null = null;

      const now = () =>
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      const resizeCanvas = () => {
        width = container.clientWidth || size;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr;
        canvas.height = width * dpr;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resizeCanvas();

      const draw = () => {
        const sphereRadius = width * SPHERE_RADIUS_RATIO;
        const centerX = width / 2;
        const centerY = width / 2;

        context.clearRect(0, 0, width, width);

        const projected = points.map((point, index) => {
          const rotated = rotatePoint(point, yaw, pitch);
          const depth = (rotated.z + 1) / 2; // 0 = back, 1 = front
          return {
            index,
            x: centerX + rotated.x * sphereRadius,
            y: centerY + rotated.y * sphereRadius,
            depth,
          };
        });
        projected.sort((a, b) => a.depth - b.depth);

        for (const entry of projected) {
          const source = loaded[entry.index].source;
          if (!source) continue;
          const iconSize = lerp(farSize, nearSize, entry.depth);
          const opacity = lerp(farOpacity, nearOpacity, entry.depth);
          context.globalAlpha = opacity;
          context.drawImage(source, entry.x - iconSize / 2, entry.y - iconSize / 2, iconSize, iconSize);
        }
        context.globalAlpha = 1;
      };

      // Maps a client-space point onto the canvas's own drawing coordinates
      // (the `width`-px space `draw` uses), tolerating any CSS scaling from the
      // responsive `maxWidth: 100%`.
      const toCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect();
        const scale = rect.width > 0 ? width / rect.width : 1;
        return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale };
      };

      // Front-most icon (largest depth) whose rendered disc contains the point,
      // or null if the click landed on empty space between icons.
      const iconIndexAtPoint = (canvasX: number, canvasY: number): number | null => {
        const sphereRadius = width * SPHERE_RADIUS_RATIO;
        const centerX = width / 2;
        const centerY = width / 2;
        let bestIndex: number | null = null;
        let bestDepth = -Infinity;
        points.forEach((point, index) => {
          const rotated = rotatePoint(point, yaw, pitch);
          const depth = (rotated.z + 1) / 2;
          const screenX = centerX + rotated.x * sphereRadius;
          const screenY = centerY + rotated.y * sphereRadius;
          const hitRadius = lerp(farSize, nearSize, depth) / 2;
          const dx = canvasX - screenX;
          const dy = canvasY - screenY;
          if (dx * dx + dy * dy <= hitRadius * hitRadius && depth > bestDepth) {
            bestDepth = depth;
            bestIndex = index;
          }
        });
        return bestIndex;
      };

      const startFocus = (index: number) => {
        const target = focusRotationForPoint(points[index]);
        const distance = Math.hypot(target.yaw - yaw, target.pitch - pitch);
        const duration = Math.min(
          FOCUS_MAX_DURATION_MS,
          Math.max(FOCUS_MIN_DURATION_MS, distance * FOCUS_DURATION_PER_RADIAN_MS),
        );
        focusTarget = {
          yaw: target.yaw,
          pitch: target.pitch,
          startYaw: yaw,
          startPitch: pitch,
          startTime: now(),
          duration,
        };
      };

      const tick = () => {
        // Belt-and-suspenders: bail without rescheduling once the canvas is
        // no longer in the document, so this loop can't outlive the
        // component even if the framework's own "Remove" hook never fires
        // (e.g. a host that wipes the DOM directly instead of going through
        // node removal).
        if (!canvas.isConnected) return;
        if (!dragging) {
          if (focusTarget) {
            // Click-to-focus easeOutCubic tween takes precedence over the
            // idle drift until it completes.
            const progress =
              focusTarget.duration > 0
                ? Math.min(1, (now() - focusTarget.startTime) / focusTarget.duration)
                : 1;
            const eased = easeOutCubic(progress);
            yaw = focusTarget.startYaw + (focusTarget.yaw - focusTarget.startYaw) * eased;
            pitch = focusTarget.startPitch + (focusTarget.pitch - focusTarget.startPitch) * eased;
            if (progress >= 1) focusTarget = null;
          } else if (!prefersReducedMotion) {
            // Idle drift: no separate momentum/coasting phase (matching the
            // reference) — every non-dragging, non-tweening frame just leans
            // the rotation toward wherever the pointer currently rests,
            // speeding up the further that pointer sits from center.
            const centerOffset = width / 2;
            const offsetX = pointerCanvasX - centerOffset;
            const offsetY = pointerCanvasY - centerOffset;
            const maxOffsetDistance = Math.hypot(centerOffset, centerOffset);
            const offsetRatio = maxOffsetDistance > 0 ? Math.hypot(offsetX, offsetY) / maxOffsetDistance : 0;
            const speed = autoRotateSpeed + offsetRatio * AUTO_ROTATE_HOVER_SPEED_BOOST;
            yaw += (offsetX / width) * speed;
            pitch += (offsetY / width) * speed;
          }
        }
        draw();
        frameHandle = requestAnimationFrame(tick);
      };

      const handlePointerDown = (event: PointerEvent) => {
        dragging = true;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        pointerDownX = event.clientX;
        pointerDownY = event.clientY;
        pointerMovedFar = false;
        // A fresh press cancels any in-flight focus tween so the drag (or the
        // next auto-rotation) takes over cleanly rather than fighting it.
        focusTarget = null;
        canvas.style.cursor = "grabbing";
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is best-effort — unsupported/detached targets are fine to ignore.
        }
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const deltaX = event.clientX - lastPointerX;
        const deltaY = event.clientY - lastPointerY;
        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
        if (!pointerMovedFar) {
          const totalX = event.clientX - pointerDownX;
          const totalY = event.clientY - pointerDownY;
          if (totalX * totalX + totalY * totalY > DRAG_CLICK_THRESHOLD_PX * DRAG_CLICK_THRESHOLD_PX) {
            pointerMovedFar = true;
          }
        }
        yaw += deltaX * dragSensitivity;
        pitch += deltaY * dragSensitivity;
      };
      // Tracks the pointer position (in the canvas's own drawing space)
      // continuously, drag or not — the only input the idle-drift branch of
      // `tick` reads.
      const handleHoverMove = (event: PointerEvent) => {
        const point = toCanvasPoint(event.clientX, event.clientY);
        pointerCanvasX = point.x;
        pointerCanvasY = point.y;
      };
      const handlePointerUp = (event: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        canvas.style.cursor = "grab";
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Best-effort release, as above.
        }
        // A press that never travelled far is a click: focus the icon under the
        // pointer (if any). A real drag falls through to the idle drift above.
        if (!pointerMovedFar) {
          const point = toCanvasPoint(event.clientX, event.clientY);
          const index = iconIndexAtPoint(point.x, point.y);
          if (index !== null) startFocus(index);
        }
      };

      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointermove", handleHoverMove);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(container);
      }

      frameHandle = requestAnimationFrame(tick);

      node.addHook("Remove", () => {
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);
        resizeObserver?.disconnect();
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handleHoverMove);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      });
    },
  };
}

export { iconCloud, easeOutCubic, focusRotationForPoint, rotatePoint };
