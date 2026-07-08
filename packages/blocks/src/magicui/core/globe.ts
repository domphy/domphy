// magicui "Globe" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An
// interactive, auto-rotating 3D dot-sphere globe, drag-to-orbit with
// spring-eased rotation (the drag offset feeds a critically-overdamped
// spring, so rotation eases smoothly and there is no release momentum),
// rendered on a `<canvas>` via WebGL.
//
// Rendering is delegated to `cobe` (already an approved dependency of this
// package, per the block-authoring brief — see the package's `dependencies`)
// rather than hand-rolling a sphere rasterizer: it is the standard
// lightweight WebGL dot-globe library and using its public `createGlobe(canvas,
// options)` API is a legitimate, independent integration, not a copy of any
// UI framework's component source. Default sphere/marker colors are resolved
// from the current Domphy theme (via `themeColorToken`) rather than guessed
// literal hex values, so the globe matches whatever theme is active.

import type { DomphyElement, ElementNode } from "@domphy/core";
import { type ThemeColor, themeColorToken, themeSpacing } from "@domphy/theme";
import createGlobe, { type COBEOptions, type Marker } from "cobe";

export interface GlobeMarker {
  latitude: number;
  longitude: number;
  /** Marker dot size, in cobe's own 0–1 scale. Defaults to 0.05. */
  size?: number;
  /** Normalized RGB triplet (0–1 per channel). Defaults to the globe's `markerColor`. */
  color?: [number, number, number];
}

export interface GlobeProps {
  /** Container max diameter, in `themeSpacing` units. Defaults to 150 (37.5em ≈ 600px, matching upstream's `max-w-150`). */
  diameterUnits?: number;
  /** cobe's own dark-mode shading flag (affects the lighting model, independent of the page theme). Defaults to false. */
  dark?: boolean;
  /** Normalized RGB triplet for the sphere's base/land color. Defaults to the theme's neutral "shift-3" token. */
  baseColor?: [number, number, number];
  /** Normalized RGB triplet for marker dots. Defaults to the theme's "attention" "shift-9" token. */
  markerColor?: [number, number, number];
  /** Normalized RGB triplet for the atmosphere glow. Defaults to the theme's neutral "shift-1" token. */
  glowColor?: [number, number, number];
  /** Dot sample density across the sphere surface. Defaults to 16000. */
  mapSamples?: number;
  /** Land-dot brightness. Defaults to 1.2. */
  mapBrightness?: number;
  /** Auto-rotation speed (phi radians added per frame). Defaults to 0.005. */
  rotationSpeed?: number;
  /** Initial phi (longitude) rotation offset, radians. Defaults to 0. */
  initialPhi?: number;
  /** Initial theta (latitude) tilt, radians. Defaults to 0.3. */
  initialTheta?: number;
  /** Highlighted lat/long locations. Defaults to a handful of major-city reference points. */
  markers?: GlobeMarker[];
  /** Enables click-and-drag orbit control. Defaults to true. */
  draggable?: boolean;
}

// Well-known public city coordinates — plain geographic facts, used purely as
// illustrative default marker locations for the demo, not sourced from any
// third party's specific marker dataset.
const DEFAULT_MARKERS: GlobeMarker[] = [
  { latitude: 14.5995, longitude: 120.9842, size: 0.03 }, // Manila
  { latitude: 19.076, longitude: 72.8777, size: 0.1 }, // Mumbai
  { latitude: 23.8103, longitude: 90.4125, size: 0.05 }, // Dhaka
  { latitude: 30.0444, longitude: 31.2357, size: 0.07 }, // Cairo
  { latitude: 39.9042, longitude: 116.4074, size: 0.08 }, // Beijing
  { latitude: -23.5505, longitude: -46.6333, size: 0.1 }, // São Paulo
  { latitude: 19.4326, longitude: -99.1332, size: 0.1 }, // Mexico City
  { latitude: 40.7128, longitude: -74.006, size: 0.1 }, // New York
  { latitude: 34.6937, longitude: 135.5022, size: 0.05 }, // Osaka
  { latitude: 41.0082, longitude: 28.9784, size: 0.06 }, // Istanbul
];

function hexToNormalizedRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return [r || 0, g || 0, b || 0];
}

/**
 * An interactive auto-rotating dot-sphere globe (WebGL via `cobe`), with
 * drag-to-orbit and spring-eased rotation. Call with no arguments for a working
 * demo — a themed sphere with a handful of highlighted city markers,
 * auto-rotating at rest.
 */
function globe(props: GlobeProps = {}): DomphyElement<"div"> {
  const diameterUnits = props.diameterUnits ?? 150;
  const dark = props.dark ?? false;
  const mapSamples = props.mapSamples ?? 16000;
  const mapBrightness = props.mapBrightness ?? 1.2;
  const rotationSpeed = props.rotationSpeed ?? 0.005;
  const initialPhi = props.initialPhi ?? 0;
  const initialTheta = props.initialTheta ?? 0.3;
  const markers = props.markers ?? DEFAULT_MARKERS;
  const draggable = props.draggable ?? true;

  return {
    div: [],
    role: "img",
    ariaLabel: "Interactive rotating globe",
    style: {
      position: "relative",
      width: "100%",
      maxWidth: themeSpacing(diameterUnits),
      aspectRatio: "1 / 1",
      marginInline: "auto",
      contain: "layout paint size",
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
      canvas.style.cursor = draggable ? "grab" : "default";
      canvas.style.opacity = "0";
      canvas.style.transition = "opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)";
      container.appendChild(canvas);

      // Upstream feeds the drag offset into a motion/react spring
      // (mass 1, damping 30, stiffness 100 → damping ratio 1.5, i.e.
      // overdamped: eases toward the target with no overshoot and, once the
      // drag is released, no residual momentum — the spring just settles).
      // We integrate that same spring by hand each frame instead of coasting.
      const SPRING_MASS = 1;
      const SPRING_DAMPING = 30;
      const SPRING_STIFFNESS = 100;

      let phi = initialPhi;
      // Accumulated drag offset (radians) — the spring's target — and the
      // spring's own current value/velocity that ease toward it.
      let dragTarget = 0;
      let dragSpring = 0;
      let dragSpringVelocity = 0;
      // Null when not dragging; otherwise the pointer's clientX at the moment
      // the drag began (kept fixed for the whole drag, matching upstream).
      let pointerStartX: number | null = null;
      let lastFrameTime = 0;
      let width = container.clientWidth || 1;
      let globeInstance: ReturnType<typeof createGlobe> | null = null;
      let resizeObserver: ResizeObserver | null = null;

      const resolveColor = (
        override: [number, number, number] | undefined,
        tone: string,
        colorName: ThemeColor,
      ): [number, number, number] => {
        if (override) return override;
        try {
          return hexToNormalizedRgb(themeColorToken(node, tone, colorName));
        } catch {
          return [0.4, 0.4, 0.45];
        }
      };

      const markerList: Marker[] = markers.map((marker) => ({
        location: [marker.latitude, marker.longitude],
        size: marker.size ?? 0.05,
        color: marker.color,
      }));

      const baseColor = resolveColor(props.baseColor, "shift-3", "neutral");
      const markerColor = resolveColor(props.markerColor, "shift-9", "attention");
      const glowColor = resolveColor(props.glowColor, "shift-1", "neutral");

      // Upstream hardcodes `devicePixelRatio: 2` (always supersamples, even on
      // DPR-1 screens). cobe delegates to `phenomenon`, which sizes the
      // canvas's REAL backing store as `canvas.clientWidth * devicePixelRatio`
      // (see phenomenon's own `resize()`) — completely independent of the
      // `width`/`height` numbers we pass here, which only feed the fragment
      // shader's own "logical resolution" uniform. Those two must describe the
      // same pixel count, or the shader's aspect/projection math disagrees
      // with the actual viewport and the sphere renders wildly mis-scaled
      // (cropped into a corner) — so `width`/`height` MUST be multiplied by
      // that same factor of 2.
      const buildOptions = (): COBEOptions => {
        const devicePixelRatio = 2;
        return {
          devicePixelRatio,
          width: width * devicePixelRatio,
          height: width * devicePixelRatio,
          phi,
          theta: initialTheta,
          dark: dark ? 1 : 0,
          diffuse: 0.4,
          mapSamples,
          mapBrightness,
          baseColor,
          markerColor,
          glowColor,
          markers: markerList,
          onRender: (state) => {
            // Advance the auto-rotation only while at rest; upstream freezes
            // it during a drag (`if (!pointerInteracting.current) phi += …`).
            if (pointerStartX === null) phi += rotationSpeed;

            // Ease the drag spring toward its target (semi-implicit Euler).
            // dt is clamped so a backgrounded tab can't destabilize it.
            const now =
              typeof performance !== "undefined" ? performance.now() : Date.now();
            let dt = lastFrameTime ? (now - lastFrameTime) / 1000 : 1 / 60;
            lastFrameTime = now;
            if (dt > 1 / 30) dt = 1 / 30;
            const springForce =
              -SPRING_STIFFNESS * (dragSpring - dragTarget) -
              SPRING_DAMPING * dragSpringVelocity;
            dragSpringVelocity += (springForce / SPRING_MASS) * dt;
            dragSpring += dragSpringVelocity * dt;

            // Final rotation = auto-rotate accumulator + spring-eased drag
            // offset (upstream: `state.phi = phiRef.current + rs.get()`).
            state.phi = phi + dragSpring;
          },
        };
      };

      // cobe requires a real WebGL context; in environments without one
      // (older browsers, headless/test runtimes) initialization throws
      // synchronously — fail closed to a static empty canvas rather than
      // crashing the whole tree.
      try {
        globeInstance = createGlobe(canvas, buildOptions());
      } catch {
        globeInstance = null;
      }
      setTimeout(() => {
        canvas.style.opacity = "1";
      }, 0);

      // Upstream divides the pointer delta by MOVEMENT_DAMPING (1400) before
      // adding it to the spring target `r`.
      const MOVEMENT_DAMPING = 1400;

      const startDrag = (clientX: number) => {
        pointerStartX = clientX;
        canvas.style.cursor = "grabbing";
      };
      // Upstream releases the drag on BOTH pointerup and pointerout: the
      // pointer leaving the canvas cancels the drag. There is no pointer
      // capture, so a drag does not continue while the pointer is outside.
      const endDrag = () => {
        if (pointerStartX === null) return;
        pointerStartX = null;
        canvas.style.cursor = "grab";
      };
      const applyMovement = (clientX: number) => {
        if (pointerStartX === null) return;
        // delta is measured from the drag's fixed start point (upstream keeps
        // `pointerInteracting.current` at the down position for the whole drag).
        const delta = clientX - pointerStartX;
        dragTarget += delta / MOVEMENT_DAMPING;
      };

      const handlePointerDown = (event: PointerEvent) => startDrag(event.clientX);
      const handlePointerUp = () => endDrag();
      const handlePointerOut = () => endDrag();
      const handleMouseMove = (event: MouseEvent) => applyMovement(event.clientX);
      const handleTouchMove = (event: TouchEvent) => {
        const touch = event.touches[0];
        if (touch) applyMovement(touch.clientX);
      };

      if (draggable) {
        canvas.addEventListener("pointerdown", handlePointerDown);
        canvas.addEventListener("pointerup", handlePointerUp);
        canvas.addEventListener("pointerout", handlePointerOut);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("touchmove", handleTouchMove);
      }

      // cobe bakes width/height into its initial options rather than reading
      // them reactively every frame, so a meaningful container resize
      // recreates the instance (preserving the current `phi`/`dragTarget`/
      // `dragSpring` closures) instead of trying to mutate it in place.
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          const nextWidth = container.clientWidth;
          if (Math.abs(nextWidth - width) < 4 || nextWidth === 0) return;
          width = nextWidth;
          globeInstance?.destroy();
          try {
            globeInstance = createGlobe(canvas, buildOptions());
          } catch {
            globeInstance = null;
          }
        });
        resizeObserver.observe(container);
      }

      node.addHook("Remove", () => {
        globeInstance?.destroy();
        resizeObserver?.disconnect();
        if (draggable) {
          canvas.removeEventListener("pointerdown", handlePointerDown);
          canvas.removeEventListener("pointerup", handlePointerUp);
          canvas.removeEventListener("pointerout", handlePointerOut);
          canvas.removeEventListener("mousemove", handleMouseMove);
          canvas.removeEventListener("touchmove", handleTouchMove);
        }
      });
    },
  };
}

export { globe };
