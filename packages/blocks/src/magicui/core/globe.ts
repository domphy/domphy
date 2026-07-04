// magicui "Globe" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An
// interactive, auto-rotating 3D dot-sphere globe, drag-to-orbit with
// inertial coasting, rendered on a `<canvas>` via WebGL.
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
  /** Container max diameter, in `themeSpacing` units. Defaults to 90 (~22.5em). */
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
  /** Land-dot brightness. Defaults to 6. */
  mapBrightness?: number;
  /** Auto-rotation speed (phi radians added per frame). Defaults to 0.0035. */
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
  { latitude: 40.7128, longitude: -74.006, size: 0.05 },
  { latitude: 51.5074, longitude: -0.1278, size: 0.05 },
  { latitude: 35.6762, longitude: 139.6503, size: 0.05 },
  { latitude: -33.8688, longitude: 151.2093, size: 0.05 },
  { latitude: 1.3521, longitude: 103.8198, size: 0.05 },
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
 * drag-to-orbit and inertial coasting. Call with no arguments for a working
 * demo — a themed sphere with a handful of highlighted city markers,
 * auto-rotating at rest.
 */
function globe(props: GlobeProps = {}): DomphyElement<"div"> {
  const diameterUnits = props.diameterUnits ?? 90;
  const dark = props.dark ?? false;
  const mapSamples = props.mapSamples ?? 16000;
  const mapBrightness = props.mapBrightness ?? 6;
  const rotationSpeed = props.rotationSpeed ?? 0.0035;
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
      container.appendChild(canvas);

      let phi = initialPhi;
      let velocity = 0;
      let pointerDown = false;
      let pointerStartX = 0;
      let phiAtPointerDown = 0;
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

      // cobe delegates to `phenomenon`, which sizes the canvas's REAL backing
      // store as `canvas.clientWidth * devicePixelRatio` (see phenomenon's own
      // `resize()`) — completely independent of the `width`/`height` numbers
      // we pass here, which only feed the fragment shader's own "logical
      // resolution" uniform. Those two must describe the same pixel count, or
      // the shader's aspect/projection math disagrees with the actual
      // viewport and the sphere renders wildly mis-scaled (cropped into a
      // corner) — so `width`/`height` MUST be multiplied by the exact same
      // `devicePixelRatio` value passed below, not a hardcoded constant.
      const buildOptions = (): COBEOptions => {
        const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        return {
          devicePixelRatio,
          width: width * devicePixelRatio,
          height: width * devicePixelRatio,
          phi,
          theta: initialTheta,
          dark: dark ? 1 : 0,
          diffuse: 1.2,
          mapSamples,
          mapBrightness,
          baseColor,
          markerColor,
          glowColor,
          markers: markerList,
          onRender: (state) => {
            if (!pointerDown) {
              if (Math.abs(velocity) > 0.0001) {
                phi += velocity;
                velocity *= 0.92;
              } else {
                phi += rotationSpeed;
              }
            }
            state.phi = phi;
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

      const handlePointerDown = (event: PointerEvent) => {
        if (!draggable) return;
        pointerDown = true;
        pointerStartX = event.clientX;
        phiAtPointerDown = phi;
        velocity = 0;
        canvas.style.cursor = "grabbing";
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is best-effort — unsupported/detached targets are fine to ignore.
        }
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (!pointerDown) return;
        const delta = event.clientX - pointerStartX;
        const nextPhi = phiAtPointerDown + delta / 100;
        velocity = nextPhi - phi;
        phi = nextPhi;
      };
      const handlePointerUp = (event: PointerEvent) => {
        if (!pointerDown) return;
        pointerDown = false;
        canvas.style.cursor = "grab";
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Best-effort release, as above.
        }
      };

      if (draggable) {
        canvas.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
      }

      // cobe bakes width/height into its initial options rather than reading
      // them reactively every frame, so a meaningful container resize
      // recreates the instance (preserving the current `phi`/`velocity`
      // closures) instead of trying to mutate it in place.
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
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
        }
      });
    },
  };
}

export { globe };
