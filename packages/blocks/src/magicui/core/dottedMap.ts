// magicui "Dotted Map" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An SVG
// world map rendered as a grid of small dots tracing continent silhouettes,
// with optional pulsing marker overlays at specific latitude/longitude
// locations.
//
// The upstream technique tests every sampled grid point against real
// geographic polygon boundaries, which needs a geo-boundary dependency this
// package intentionally avoids (per the port's own research note). Instead,
// each landmass is approximated as one or more ellipses in
// (longitude, latitude) space, with a small per-point pseudo-random jitter
// on the ellipse boundary so coastlines read as a stippled fringe instead of
// a perfectly smooth curve. This is a stylized, hand-authored approximation
// suitable for a decorative/illustrative backdrop — not a geographic dataset.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

export interface DottedMapMarker {
  latitude: number;
  longitude: number;
  /** Accessible label announced for this marker (also used as the visible label when no `renderOverlay`). */
  label?: string;
  /** Marker dot radius (SVG units). Defaults to the map's `dotRadius`, matching upstream's `marker.size ?? dotRadius`. */
  size?: number;
  /** Marker color. Defaults to the map's `markerColor`. */
  color?: ThemeColor;
  /** Overrides the map's global `pulse` setting for just this marker. */
  pulse?: boolean;
  /** Renders custom overlay content (e.g. an avatar image) anchored at the marker's projected position, circular-clipped, layered on top of the base dot. */
  renderOverlay?: () => DomphyElement;
}

export interface DottedMapProps {
  /** SVG viewBox width (user units). Defaults to `150`. */
  width?: number;
  /** SVG viewBox height (user units). Defaults to `75`. */
  height?: number;
  /** Grid columns sampled across the map width (rows derive from the 2:1 aspect ratio) — more columns = denser dot grid. Defaults to `80`. */
  columns?: number;
  markers?: DottedMapMarker[];
  /** Land-dot radius, and the default marker radius when a marker has no `size` (SVG units). Defaults to `0.2`. */
  dotRadius?: number;
  /** Background dot color — dots render with `fill: currentColor`, so this sets the map's `color`. Defaults to `"neutral"`. */
  dotColor?: ThemeColor;
  /** Default marker color, overridable per marker. Defaults to `"primary"`. */
  markerColor?: ThemeColor;
  /** Default pulse setting, overridable per marker. Defaults to `false`. */
  pulse?: boolean;
  /** Offsets alternating rows horizontally by half a column width for a more organic dot layout. Defaults to `true`. */
  staggerRows?: boolean;
  style?: StyleObject;
}

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 75;
const DEFAULT_COLUMNS = 80;
const DEFAULT_DOT_RADIUS = 0.2;

const DEFAULT_MARKERS: DottedMapMarker[] = [
  { latitude: 40.7128, longitude: -74.006, label: "New York", size: 0.8, pulse: true },
  { latitude: 51.5072, longitude: -0.1276, label: "London", size: 0.8, pulse: true },
  { latitude: 35.6762, longitude: 139.6503, label: "Tokyo", size: 0.8, pulse: true },
  { latitude: -33.8688, longitude: 151.2093, label: "Sydney", size: 0.8, pulse: true },
];

interface LandRegion {
  longitude: number;
  latitude: number;
  radiusLongitude: number;
  radiusLatitude: number;
}

// Hand-authored, coarse ellipse approximation of each continent's rough
// footprint — not a traced geographic boundary. Ordering/values are a
// stylized artistic approximation for a decorative backdrop.
const LAND_REGIONS: LandRegion[] = [
  { longitude: -105, latitude: 50, radiusLongitude: 32, radiusLatitude: 22 }, // North America
  { longitude: -85, latitude: 68, radiusLongitude: 18, radiusLatitude: 10 }, // Canadian Arctic
  { longitude: -42, latitude: 72, radiusLongitude: 11, radiusLatitude: 9 }, // Greenland
  { longitude: -90, latitude: 17, radiusLongitude: 8, radiusLatitude: 7 }, // Central America
  { longitude: -60, latitude: -15, radiusLongitude: 20, radiusLatitude: 38 }, // South America
  { longitude: 10, latitude: 52, radiusLongitude: 20, radiusLatitude: 15 }, // Europe
  { longitude: 35, latitude: 63, radiusLongitude: 22, radiusLatitude: 11 }, // Scandinavia / NW Russia
  { longitude: 20, latitude: 5, radiusLongitude: 22, radiusLatitude: 33 }, // Africa
  { longitude: 90, latitude: 58, radiusLongitude: 58, radiusLatitude: 18 }, // Siberia / Central Asia
  { longitude: 48, latitude: 27, radiusLongitude: 12, radiusLatitude: 12 }, // Middle East
  { longitude: 78, latitude: 22, radiusLongitude: 11, radiusLatitude: 13 }, // Indian subcontinent
  { longitude: 108, latitude: 32, radiusLongitude: 16, radiusLatitude: 14 }, // East Asia
  { longitude: 138, latitude: 38, radiusLongitude: 5, radiusLatitude: 7 }, // Japan
  { longitude: 112, latitude: 2, radiusLongitude: 22, radiusLatitude: 13 }, // Maritime Southeast Asia
  { longitude: 133, latitude: -25, radiusLongitude: 19, radiusLatitude: 13 }, // Australia
  { longitude: 172, latitude: -41, radiusLongitude: 3, radiusLatitude: 5 }, // New Zealand
  { longitude: 47, latitude: -19, radiusLongitude: 3, radiusLatitude: 7 }, // Madagascar
];

// Upstream animates each ping ring's `r` attribute from `r` to `r * 2.8` over
// 1.4s (SMIL, linear default) while opacity fades to 0; the second ring is the
// same animation offset by 0.7s (a repeating double-ping). SMIL is unusable
// here — Domphy kebab-cases every non-CamelAttribute key, so `attributeName`/
// `repeatCount` would emit as invalid `attribute-name`/`repeat-count` — so this
// reproduces it with a CSS @keyframes that animates the `r` GEOMETRY property
// (not a `transform: scale`, which would also scale the stroke and thicken the
// ring; growing `r` keeps `stroke-width` constant in user units like upstream).
// ponytail: CSS `r`-animation matches upstream's SMIL on evergreen engines;
// pre-16 Safari (no CSS geometry animation) shows a static ring, not a crash.
const PULSE_DURATION = "1.4s";
const PULSE_SCALE = 2.8;
const PULSE_RING_BEGIN = "0.7s";

/** Cheap deterministic pseudo-random value in [0, 1) from a numeric seed — no external RNG dependency. */
function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/** Whether a lat/long point falls inside any hand-authored landmass ellipse, with a soft
 * jittered boundary (0.85–1.15 instead of a hard 1.0 cutoff) so edges look stippled. */
function isLandApprox(latitude: number, longitude: number): boolean {
  for (const region of LAND_REGIONS) {
    const normalizedLongitude = (longitude - region.longitude) / region.radiusLongitude;
    const normalizedLatitude = (latitude - region.latitude) / region.radiusLatitude;
    const distance = normalizedLongitude * normalizedLongitude + normalizedLatitude * normalizedLatitude;
    const jitter = 0.85 + pseudoRandom(latitude * 1000 + longitude) * 0.3;
    if (distance <= jitter) return true;
  }
  return false;
}

/** Equirectangular projection: lat/long → SVG (x, y) in the map's viewBox space. */
function projectLatLong(latitude: number, longitude: number, width: number, height: number): { x: number; y: number } {
  return { x: ((longitude + 180) / 360) * width, y: ((90 - latitude) / 180) * height };
}

interface DotPoint {
  x: number;
  y: number;
}

/** Pre-computes the static background dot grid once: samples an equirectangular grid,
 * keeps only points classified as land, and (optionally) staggers alternating rows. */
function buildDotGrid(columns: number, width: number, height: number, staggerRows: boolean): DotPoint[] {
  const rows = Math.max(1, Math.round(columns / 2));
  const columnStep = width / columns;
  const rowStep = height / rows;
  const points: DotPoint[] = [];

  for (let row = 0; row < rows; row += 1) {
    const latitude = 90 - ((row + 0.5) / rows) * 180;
    const staggerOffset = staggerRows && row % 2 === 1 ? columnStep / 2 : 0;
    for (let column = 0; column < columns; column += 1) {
      const longitude = ((column + 0.5) / columns) * 360 - 180;
      if (!isLandApprox(latitude, longitude)) continue;
      const x = column * columnStep + columnStep / 2 + staggerOffset;
      if (x > width) continue; // dropped off the right edge by the stagger offset
      const y = row * rowStep + rowStep / 2;
      points.push({ x, y });
    }
  }
  return points;
}

/** Snaps a projected marker position to the nearest land dot in the grid, so markers sit on
 * the dot lattice (and inherit its per-row stagger) — the analog of upstream's `addMarkers`. */
function snapToNearestDot(x: number, y: number, dots: DotPoint[]): DotPoint {
  let best: DotPoint = { x, y };
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const dot of dots) {
    const dx = dot.x - x;
    const dy = dot.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = dot;
    }
  }
  return best;
}

function dotElement(point: DotPoint, index: number, radius: number): DomphyElement {
  return {
    circle: null,
    _key: `dot-${index}`,
    cx: point.x,
    cy: point.y,
    r: radius,
    style: { fill: "currentColor" } as StyleObject,
  } as DomphyElement;
}

/** Two concentric, hollow (fill:none) stroked rings expanding from `r` to `r * PULSE_SCALE`
 * while fading out — an expanding radar ring, staggered into a repeating double-ping. */
function pulseRings(x: number, y: number, radius: number, color: ThemeColor): DomphyElement {
  const targetRadius = radius * PULSE_SCALE;
  const keyframesA = {
    "0%": { r: `${radius}px`, opacity: 1 },
    "100%": { r: `${targetRadius}px`, opacity: 0 },
  };
  const keyframesB = {
    "0%": { r: `${radius}px`, opacity: 0.9 },
    "100%": { r: `${targetRadius}px`, opacity: 0 },
  };
  const nameA = `dotted-map-ping-a-${hashString(JSON.stringify(keyframesA))}`;
  const nameB = `dotted-map-ping-b-${hashString(JSON.stringify(keyframesB))}`;

  const ring = (
    key: string,
    name: string,
    keyframes: object,
    strokeWidth: number,
    delay: string,
  ): DomphyElement =>
    ({
      circle: null,
      _key: key,
      cx: x,
      cy: y,
      r: radius,
      ariaHidden: "true",
      _doctorDisable: "missing-color",
      style: {
        fill: "none",
        stroke: (listener: Listener) => themeColor(listener, "shift-9", color),
        strokeWidth,
        animation: `${name} ${PULSE_DURATION} linear ${delay} infinite`,
        [`@keyframes ${name}`]: keyframes,
      } as StyleObject,
    }) as DomphyElement;

  return {
    g: [
      ring("ping-a", nameA, keyframesA, 0.35, "0s"),
      ring("ping-b", nameB, keyframesB, 0.3, PULSE_RING_BEGIN),
    ],
    _key: "pulse",
    style: { pointerEvents: "none" } as StyleObject,
  } as DomphyElement;
}

function markerElement(
  marker: DottedMapMarker,
  index: number,
  width: number,
  height: number,
  dots: DotPoint[],
  defaultColor: ThemeColor,
  defaultPulse: boolean,
  dotRadius: number,
): DomphyElement {
  const projected = projectLatLong(marker.latitude, marker.longitude, width, height);
  const { x, y } = snapToNearestDot(projected.x, projected.y, dots);
  const radius = marker.size ?? dotRadius;
  const color = marker.color ?? defaultColor;
  const pulseEnabled = marker.pulse ?? defaultPulse;
  const children: DomphyElement[] = [];

  // Upstream always draws the solid base dot, then (optionally) the pulse rings,
  // then any overlay on top — the overlay never replaces the base dot.
  children.push({
    circle: null,
    _key: "dot",
    cx: x,
    cy: y,
    r: radius,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      fill: (listener: Listener) => themeColor(listener, "shift-9", color),
    } as StyleObject,
  } as DomphyElement);

  if (pulseEnabled) {
    children.push(pulseRings(x, y, radius, color));
  }

  if (marker.renderOverlay) {
    const overlaySize = radius * 2.4;
    children.push({
      foreignObject: [
        {
          div: [marker.renderOverlay()],
          style: { width: "100%", height: "100%", overflow: "hidden", borderRadius: "50%", clipPath: "circle(50%)" },
        },
      ],
      _key: "overlay",
      x: x - overlaySize / 2,
      y: y - overlaySize / 2,
      width: overlaySize,
      height: overlaySize,
    } as DomphyElement);
  }

  return {
    g: children,
    _key: `marker-${index}`,
    role: marker.label ? "img" : undefined,
    ariaLabel: marker.label,
  } as DomphyElement;
}

/**
 * SVG world map rendered as a stippled grid of dots, with optional pulsing
 * marker overlays at specific latitude/longitude coordinates. Purely static
 * — the base dot grid never animates; only pulsing markers (opt-in, on by
 * default for the demo) loop an expanding radar-ping double-ring via CSS
 * `@keyframes`. Call with no arguments for a working demo — four pulsing city
 * markers.
 */
function dottedMap(props: DottedMapProps = {}): DomphyElement<"svg"> {
  const width = props.width ?? DEFAULT_WIDTH;
  const height = props.height ?? DEFAULT_HEIGHT;
  const columns = Math.max(10, Math.round(props.columns ?? DEFAULT_COLUMNS));
  const dotRadius = props.dotRadius ?? DEFAULT_DOT_RADIUS;
  const dotColor = props.dotColor ?? "neutral";
  const markerColor = props.markerColor ?? "primary";
  const globalPulse = props.pulse ?? false;
  const staggerRows = props.staggerRows ?? true;
  const markers = props.markers ?? DEFAULT_MARKERS;

  const dots = buildDotGrid(columns, width, height, staggerRows);

  return {
    svg: [
      { g: dots.map((point, index) => dotElement(point, index, dotRadius)), _key: "dot-layer" } as DomphyElement,
      {
        g: markers.map((marker, index) =>
          markerElement(marker, index, width, height, dots, markerColor, globalPulse, dotRadius),
        ),
        _key: "marker-layer",
      } as DomphyElement,
    ],
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    ariaLabel: "World map with highlighted locations",
    style: {
      width: "100%",
      height: "100%",
      color: (listener: Listener) => themeColor(listener, "shift-7", dotColor),
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"svg">;
}

export { dottedMap };
