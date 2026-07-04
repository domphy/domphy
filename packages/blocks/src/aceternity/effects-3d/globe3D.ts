// Aceternity UI "3D Globe" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// realistically textured, slowly auto-rotating Earth rendered in real-time
// WebGL, with drag-to-orbit, wheel-to-zoom, and avatar-image markers pinned
// at given coordinates.
//
// Per the task's own researchNote, this is the "photographic texture +
// bump map" globe variant — distinct from this package's OWN
// `magicui/core/globe.ts`, which ports the separate dot-matrix globe by
// delegating to the `cobe` library. `cobe`'s public API only renders that
// dot/point style; it has no textured-sphere-with-lighting mode, so it
// cannot render this spec. Rather than reach for a new 3D dependency (not
// pre-approved for this package — see the task's own dependency list), this
// hand-rolls a small, self-contained WebGL1 pipeline: a generated
// lat/long sphere mesh, a Phong-ish lighting shader with a fresnel-rim
// "atmosphere" term, and manual mat4 camera math (perspective + a
// pure-rotation model matrix) — all standard, textbook real-time-graphics
// technique, not sourced from any specific engine or library.
//
// FIDELITY NOTES (honest gaps, since "textured + bump map" implies more
// than this can promise without a real DEM/heightmap asset or a WebGL1
// derivatives extension):
//  - The default Earth-like texture (used whenever `baseTextureUrl` isn't
//    supplied) is procedurally painted onto an offscreen 2D canvas — an
//    ocean gradient plus a handful of deterministic blob "continents" — not
//    a real satellite/DEM photograph. Real photographic fidelity would
//    require shipping (or fetching) an actual Earth texture asset, which is
//    outside a clean-room, zero-network-by-default component.
//  - The "bump map" is a shading MULTIPLIER (the bump texture's red channel
//    scales the diffuse term per-pixel, "embossing" the lit hemisphere) —
//    not true per-pixel normal perturbation. WebGL1 core has no
//    `dFdx`/`dFdy` without the `OES_standard_derivatives` extension, and a
//    real normal map needs actual tangent-space data this procedural
//    texture doesn't have; the multiplier approach reads as embossed
//    terrain from a normal viewing distance without either.
//  - Orbit "drag to rotate" rotates the SPHERE (model matrix) rather than
//    moving the camera around a fixed sphere — visually identical for a
//    single centered object with no other scene geometry, and it's the same
//    trick this package's own `magicui/core/globe.ts` (cobe) and most
//    single-object 3D viewers use.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar } from "@domphy/ui";
import { type ThemeColor, themeColor, themeColorToken, themeSpacing } from "@domphy/theme";

export interface Globe3DMarker {
  latitude: number;
  longitude: number;
  /** Short label shown in the hover tooltip. */
  label?: string;
  /** Avatar image URL. When omitted, `initials` render inside a themed circle instead. */
  avatarUrl?: string;
  /** Fallback initials shown when `avatarUrl` is omitted. Defaults to `"•"`. */
  initials?: string;
  /** Marker avatar color family. Defaults to `"primary"`. */
  color?: ThemeColor;
}

export interface Globe3DProps {
  /** Pinned marker locations. Defaults to a handful of major-city reference points. */
  markers?: Globe3DMarker[];
  /** Container max diameter, in `themeSpacing` units. Defaults to `100` (~25em). */
  diameterUnits?: number;
  /** Real Earth-texture image URL. When omitted, a procedural placeholder texture is generated instead. */
  baseTextureUrl?: string;
  /** Bump/height-map image URL (red channel used as a diffuse-shading multiplier). When omitted, a procedural placeholder is generated instead. */
  bumpTextureUrl?: string;
  /** Ambient (unlit-side) light floor, 0-1. Defaults to `0.5`. */
  ambientIntensity?: number;
  /** Directional light strength, 0-1+. Defaults to `0.9`. */
  lightIntensity?: number;
  /** Directional light vector (world space, points FROM the surface TOWARD the light). Defaults to `[0.6, 0.5, 0.7]`. */
  lightDirection?: [number, number, number];
  /** Theme color family for the fresnel-rim atmosphere glow. Defaults to `"info"`. */
  atmosphereColor?: ThemeColor;
  /** Atmosphere glow strength, 0-1+. Defaults to `0.9`. */
  atmosphereIntensity?: number;
  /** Continuous idle auto-rotation. Defaults to `true`. */
  autoRotate?: boolean;
  /** Auto-rotation speed, radians/frame. Defaults to `0.0016`. */
  rotationSpeed?: number;
  /** Closest allowed camera distance (zoom in limit). Defaults to `1.7`. */
  minZoomDistance?: number;
  /** Farthest allowed camera distance (zoom out limit). Defaults to `4.5`. */
  maxZoomDistance?: number;
  /** Starting camera distance. Defaults to `2.6`. */
  initialZoomDistance?: number;
  /** Renders the raw triangle mesh (debug aid) instead of the shaded sphere. Defaults to `false`. */
  wireframe?: boolean;
  /** Fired when a marker gains/loses hover (`null` on loses-hover). */
  onMarkerHover?: (marker: Globe3DMarker | null) => void;
  /** Fired when a marker is clicked. */
  onMarkerClick?: (marker: Globe3DMarker, event: PointerEvent) => void;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

// Well-known public city coordinates — plain geographic facts, used purely
// as illustrative default marker locations, not sourced from any third
// party's specific marker dataset (same idiom this package's own
// `magicui/core/globe.ts` uses for its own defaults).
const DEFAULT_MARKERS: Globe3DMarker[] = [
  { latitude: 40.7128, longitude: -74.006, initials: "NY", label: "New York", color: "primary" },
  { latitude: 51.5074, longitude: -0.1278, initials: "LN", label: "London", color: "info" },
  { latitude: 35.6762, longitude: 139.6503, initials: "TK", label: "Tokyo", color: "success" },
  { latitude: -33.8688, longitude: 151.2093, initials: "SY", label: "Sydney", color: "warning" },
  { latitude: 1.3521, longitude: 103.8198, initials: "SG", label: "Singapore", color: "secondary" },
];

const LATITUDE_SEGMENTS = 24;
const LONGITUDE_SEGMENTS = 48;
const TEXTURE_SIZE = 512;

// ---------------------------------------------------------------------------
// mat4 — minimal column-major 4x4 matrix helpers. Standard textbook
// real-time-graphics math (identical in form to gl-matrix/three.js's own
// perspective/rotation formulas), hand-written here rather than adding a
// matrix-math dependency for four small functions.
// ---------------------------------------------------------------------------

type Mat4 = Float32Array;

function mat4Identity(): Mat4 {
  return Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

function mat4Perspective(fovYRadians: number, aspect: number, near: number, far: number): Mat4 {
  const focalLength = 1 / Math.tan(fovYRadians / 2);
  const out = new Float32Array(16);
  out[0] = focalLength / aspect;
  out[5] = focalLength;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function mat4Translation(x: number, y: number, z: number): Mat4 {
  const out = mat4Identity();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

function mat4RotationX(radians: number): Mat4 {
  const out = mat4Identity();
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  out[5] = cos;
  out[6] = sin;
  out[9] = -sin;
  out[10] = cos;
  return out;
}

function mat4RotationY(radians: number): Mat4 {
  const out = mat4Identity();
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  out[0] = cos;
  out[2] = -sin;
  out[8] = sin;
  out[10] = cos;
  return out;
}

/** Transforms a point (implicit w=1) through `matrix`, returning the full `[x, y, z, w]`. */
function mat4TransformPoint(matrix: Mat4, x: number, y: number, z: number): [number, number, number, number] {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15],
  ];
}

// ---------------------------------------------------------------------------
// Sphere geometry + lat/long placement — a standard equirectangular UV
// sphere. `phi`/`theta` conventions are shared between the mesh generator
// and `latitudeLongitudeToPosition` below so markers land in the same
// coordinate space the mesh (and its texture UVs) use.
// ---------------------------------------------------------------------------

interface SphereGeometry {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

function buildSphereGeometry(latitudeSegments: number, longitudeSegments: number): SphereGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let latitudeIndex = 0; latitudeIndex <= latitudeSegments; latitudeIndex++) {
    const theta = (latitudeIndex / latitudeSegments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    for (let longitudeIndex = 0; longitudeIndex <= longitudeSegments; longitudeIndex++) {
      const phi = (longitudeIndex / longitudeSegments) * Math.PI * 2;
      const x = -Math.cos(phi) * sinTheta;
      const y = cosTheta;
      const z = Math.sin(phi) * sinTheta;
      positions.push(x, y, z);
      uvs.push(longitudeIndex / longitudeSegments, latitudeIndex / latitudeSegments);
    }
  }

  const columnCount = longitudeSegments + 1;
  for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex++) {
    for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex++) {
      const a = latitudeIndex * columnCount + longitudeIndex;
      const b = a + columnCount;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

/** Same `theta`/`phi` convention `buildSphereGeometry` uses, so markers align with the mesh/texture. */
function latitudeLongitudeToPosition(latitudeDegrees: number, longitudeDegrees: number): [number, number, number] {
  const theta = ((90 - latitudeDegrees) * Math.PI) / 180;
  const phi = ((longitudeDegrees + 180) * Math.PI) / 180;
  const sinTheta = Math.sin(theta);
  return [-Math.cos(phi) * sinTheta, Math.cos(theta), Math.sin(phi) * sinTheta];
}

// ---------------------------------------------------------------------------
// Shaders (GLSL ES 1.00 / WebGL1). Diffuse lighting + a fresnel-rim
// "atmosphere" term; the bump texture's red channel scales the diffuse term
// rather than perturbing the normal (see the file-header fidelity note).
// ---------------------------------------------------------------------------

const VERTEX_SHADER_SOURCE = `
  attribute vec3 aPosition;
  attribute vec2 aUv;
  uniform mat4 uModel;
  uniform mat4 uView;
  uniform mat4 uProjection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  void main() {
    vec4 worldPosition = uModel * vec4(aPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = mat3(uModel) * aPosition;
    vUv = aUv;
    gl_Position = uProjection * uView * worldPosition;
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  uniform sampler2D uBaseTexture;
  uniform sampler2D uBumpTexture;
  uniform vec3 uLightDirection;
  uniform vec3 uCameraPosition;
  uniform vec3 uAtmosphereColor;
  uniform float uAmbientIntensity;
  uniform float uLightIntensity;
  uniform float uAtmosphereIntensity;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 lightDirection = normalize(uLightDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float bump = texture2D(uBumpTexture, vUv).r;
    vec3 baseColor = texture2D(uBaseTexture, vUv).rgb;
    vec3 lit = baseColor * (uAmbientIntensity + uLightIntensity * diffuse * (0.65 + 0.35 * bump));
    vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
    float fresnel = pow(clamp(1.0 - max(dot(normal, viewDirection), 0.0), 0.0, 1.0), 2.5);
    vec3 color = lit + uAtmosphereColor * fresnel * uAtmosphereIntensity;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function hexToBytes(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return [Number.isNaN(r) ? 0 : r, Number.isNaN(g) ? 0 : g, Number.isNaN(b) ? 0 : b];
}

function hexToUnitFloats(hex: string): [number, number, number] {
  const [r, g, b] = hexToBytes(hex);
  return [r / 255, g / 255, b / 255];
}

/** Deterministic irregular blob outline (not true randomness) around `(centerX, centerY)`, for a
 * procedural "continent" silhouette — a generic, hand-authored technique, not sourced from any
 * specific texture/asset. */
function drawBlob(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  baseRadius: number,
  seed: number,
): void {
  const pointCount = 10;
  context.beginPath();
  for (let index = 0; index <= pointCount; index++) {
    const angle = (index / pointCount) * Math.PI * 2;
    const wobble = 0.65 + 0.35 * Math.sin(angle * 2.7 + seed) + 0.15 * Math.cos(angle * 4.3 + seed * 1.7);
    const radius = baseRadius * wobble;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.7;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

/** Builds a procedural Earth-like placeholder texture (ocean + a handful of continent-like blobs)
 * plus a matching grayscale bump canvas, entirely from theme tokens — used whenever the caller
 * doesn't supply `baseTextureUrl`/`bumpTextureUrl`. Returns `null` if canvas 2D isn't available. */
function buildProceduralTextures(
  node: ElementNode,
): { colorCanvas: HTMLCanvasElement; bumpCanvas: HTMLCanvasElement } | null {
  if (typeof document === "undefined") return null;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = TEXTURE_SIZE;
  colorCanvas.height = TEXTURE_SIZE / 2;
  const colorContext = colorCanvas.getContext("2d");
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = TEXTURE_SIZE;
  bumpCanvas.height = TEXTURE_SIZE / 2;
  const bumpContext = bumpCanvas.getContext("2d");
  if (!colorContext || !bumpContext) return null;

  const oceanDeep = themeColorToken(node, "shift-13", "info");
  const oceanShallow = themeColorToken(node, "shift-9", "info");
  const landColor = themeColorToken(node, "shift-9", "success");
  const landShade = themeColorToken(node, "shift-11", "success");

  const oceanGradient = colorContext.createLinearGradient(0, 0, 0, colorCanvas.height);
  oceanGradient.addColorStop(0, oceanDeep);
  oceanGradient.addColorStop(0.5, oceanShallow);
  oceanGradient.addColorStop(1, oceanDeep);
  colorContext.fillStyle = oceanGradient;
  colorContext.fillRect(0, 0, colorCanvas.width, colorCanvas.height);

  // The bump canvas is grayscale HEIGHT data (read back as a scalar
  // shading multiplier in the fragment shader), not a themed UI color, so
  // literal grays are intentional here — the same reasoning this package's
  // own `card3D.ts` placeholder-graphic SVG data URI uses for its own
  // literal fill colors (generated raster/vector asset content, not themed
  // chrome). Every user-visible surface color above (`oceanDeep`,
  // `oceanShallow`, `landColor`, `landShade`) IS resolved through
  // `themeColorToken()`.
  bumpContext.fillStyle = "#202020";
  bumpContext.fillRect(0, 0, bumpCanvas.width, bumpCanvas.height);

  // Deterministic blob placements spread across the equirectangular map —
  // fixed coordinates (not `Math.random()`) so the texture is reproducible.
  const blobs: Array<[number, number, number, number]> = [
    [0.12, 0.32, 0.09, 1.1],
    [0.22, 0.62, 0.07, 2.4],
    [0.35, 0.25, 0.06, 0.6],
    [0.48, 0.55, 0.1, 3.3],
    [0.58, 0.28, 0.05, 1.8],
    [0.68, 0.68, 0.08, 4.1],
    [0.78, 0.35, 0.07, 2.9],
    [0.88, 0.58, 0.06, 0.4],
    [0.05, 0.75, 0.05, 3.7],
    [0.92, 0.2, 0.05, 1.2],
  ];

  for (const [fractionX, fractionY, fractionRadius, seed] of blobs) {
    const centerX = fractionX * colorCanvas.width;
    const centerY = fractionY * colorCanvas.height;
    const radius = fractionRadius * colorCanvas.width;

    colorContext.fillStyle = landColor;
    drawBlob(colorContext, centerX, centerY, radius, seed);
    colorContext.fillStyle = landShade;
    drawBlob(colorContext, centerX + radius * 0.15, centerY + radius * 0.15, radius * 0.55, seed + 5);

    bumpContext.fillStyle = "#e8e8e8";
    drawBlob(bumpContext, centerX, centerY, radius, seed);
    bumpContext.fillStyle = "#ffffff";
    drawBlob(bumpContext, centerX - radius * 0.1, centerY - radius * 0.1, radius * 0.4, seed + 5);
  }

  return { colorCanvas, bumpCanvas };
}

function createTextureFromSource(
  gl: WebGLRenderingContext,
  source: TexImageSource,
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

function createFlatTexture(gl: WebGLRenderingContext, rgb: [number, number, number]): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const bytes = new Uint8Array([Math.round(rgb[0] * 255), Math.round(rgb[1] * 255), Math.round(rgb[2] * 255), 255]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return texture;
}

function loadTextureFromUrl(
  gl: WebGLRenderingContext,
  url: string,
  onLoaded: (texture: WebGLTexture) => void,
): void {
  if (typeof Image === "undefined") return;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => {
    const texture = createTextureFromSource(gl, image);
    if (texture) onLoaded(texture);
  };
  image.src = url;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface MarkerRuntime {
  marker: Globe3DMarker;
  element: HTMLElement;
}

/**
 * A realistically textured, slowly auto-rotating 3D Earth (WebGL1, hand-rolled
 * — no `three.js`/scene-graph dependency), with drag-to-orbit, wheel-to-zoom,
 * and avatar-image markers pinned at given coordinates that show a tooltip on
 * hover. Call with no arguments for a working demo — a themed procedural
 * globe auto-rotating with a handful of highlighted city markers.
 */
function globe3D(props: Globe3DProps = {}): DomphyElement<"div"> {
  const markers = props.markers && props.markers.length > 0 ? props.markers : DEFAULT_MARKERS;
  const diameterUnits = props.diameterUnits ?? 100;
  const ambientIntensity = props.ambientIntensity ?? 0.5;
  const lightIntensity = props.lightIntensity ?? 0.9;
  const lightDirection = props.lightDirection ?? [0.6, 0.5, 0.7];
  const atmosphereColorFamily = props.atmosphereColor ?? "info";
  const atmosphereIntensity = props.atmosphereIntensity ?? 0.9;
  const autoRotate = props.autoRotate ?? true;
  const rotationSpeed = props.rotationSpeed ?? 0.0016;
  const minZoomDistance = props.minZoomDistance ?? 1.7;
  const maxZoomDistance = props.maxZoomDistance ?? 4.5;
  const initialZoomDistance = clamp(props.initialZoomDistance ?? 2.6, minZoomDistance, maxZoomDistance);
  const wireframe = props.wireframe ?? false;

  const markerRuntimes: MarkerRuntime[] = [];
  let tooltipElement: HTMLElement | null = null;
  // A real `State` (not a plain closure variable) — the tooltip's own text
  // content reads it via `.get(listener)` so Domphy's reactivity actually
  // re-renders the label on hover change; the per-frame render loop below
  // reads the current value with an untracked `.get()` (it already polls
  // every frame, so it doesn't need a subscription).
  const hoveredMarkerIndexState = toState<number | null>(null);

  const markerElements: DomphyElement<"span">[] = markers.map((marker, markerIndex) => ({
    span: [
      marker.avatarUrl
        ? ({ img: null, src: marker.avatarUrl, alt: marker.label ?? "" } as DomphyElement)
        : (marker.initials ?? "•"),
    ],
    _key: `globe3d-marker-${markerIndex}`,
    $: [avatar({ color: marker.color ?? "primary" })],
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: themeSpacing(7),
      height: themeSpacing(7),
      transform: "translate(-9999px, -9999px)",
      opacity: 0,
      pointerEvents: "auto",
      cursor: "pointer",
      transition: "opacity 120ms ease-out",
      willChange: "transform, opacity",
    } as StyleObject,
    _onMount: (markerNode: ElementNode) => {
      const element = markerNode.domElement as HTMLElement;
      markerRuntimes.push({ marker, element });
      const showTooltip = () => {
        hoveredMarkerIndexState.set(markerIndex);
        props.onMarkerHover?.(marker);
      };
      const hideTooltip = () => {
        if (hoveredMarkerIndexState.get() === markerIndex) hoveredMarkerIndexState.set(null);
        props.onMarkerHover?.(null);
      };
      const handleClick = (event: MouseEvent) => props.onMarkerClick?.(marker, event as PointerEvent);
      element.addEventListener("pointerenter", showTooltip);
      element.addEventListener("pointerleave", hideTooltip);
      element.addEventListener("click", handleClick);
      markerNode.addHook("Remove", () => {
        element.removeEventListener("pointerenter", showTooltip);
        element.removeEventListener("pointerleave", hideTooltip);
        element.removeEventListener("click", handleClick);
        const runtimeIndex = markerRuntimes.findIndex((runtime) => runtime.element === element);
        if (runtimeIndex >= 0) markerRuntimes.splice(runtimeIndex, 1);
      });
    },
  })) as DomphyElement<"span">[];

  const tooltip: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const index = hoveredMarkerIndexState.get(listener);
      return index !== null ? (markers[index]?.label ?? "") : "";
    },
    dataTone: "shift-17",
    dataSize: "decrease-1",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      transform: "translate(-9999px, -9999px)",
      opacity: 0,
      pointerEvents: "none",
      whiteSpace: "nowrap",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(3),
      borderRadius: themeSpacing(999),
      transition: "opacity 120ms ease-out",
      zIndex: 10,
      backgroundColor: (listener: Listener) => themeColor(listener),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
    _onMount: (tooltipNode: ElementNode) => {
      tooltipElement = tooltipNode.domElement as HTMLElement;
    },
    _onRemove: () => {
      tooltipElement = null;
    },
  } as DomphyElement<"div">;

  return {
    div: [...markerElements, tooltip],
    role: "img",
    ariaLabel: "Interactive rotating textured globe",
    style: {
      position: "relative",
      width: "100%",
      maxWidth: themeSpacing(diameterUnits),
      aspectRatio: "1 / 1",
      marginInline: "auto",
      contain: "layout paint size",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const container = node.domElement as HTMLElement | null;
      if (!container || typeof document === "undefined") return;

      const canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.cursor = "grab";
      canvas.style.touchAction = "none";
      container.insertBefore(canvas, container.firstChild);

      let gl: WebGLRenderingContext | null = null;
      try {
        // preserveDrawingBuffer: true — without it, the default WebGL buffer
        // swap can clear the canvas between the last draw call and any
        // external capture (screenshot tools, html2canvas, etc.) reading it,
        // making the canvas appear blank even though it rendered correctly.
        const contextOptions = { preserveDrawingBuffer: true };
        gl =
          (canvas.getContext("webgl", contextOptions) as WebGLRenderingContext | null) ??
          (canvas.getContext("experimental-webgl", contextOptions) as WebGLRenderingContext | null);
      } catch {
        gl = null;
      }

      let resizeObserver: ResizeObserver | null = null;
      let animationFrameHandle = 0;
      let disposed = false;

      // --- Orbit-control + auto-rotate state (kept regardless of whether
      // WebGL initialized, so the code path is exercised consistently). ---
      let yaw = 0;
      let pitch = -0.25;
      let distance = initialZoomDistance;
      let pointerDown = false;
      let pointerLastX = 0;
      let pointerLastY = 0;

      const handlePointerDown = (event: PointerEvent) => {
        pointerDown = true;
        pointerLastX = event.clientX;
        pointerLastY = event.clientY;
        canvas.style.cursor = "grabbing";
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is best-effort — unsupported/detached targets are fine to ignore.
        }
      };
      const handlePointerMove = (event: PointerEvent) => {
        if (!pointerDown) return;
        const deltaX = event.clientX - pointerLastX;
        const deltaY = event.clientY - pointerLastY;
        pointerLastX = event.clientX;
        pointerLastY = event.clientY;
        yaw += deltaX * 0.006;
        pitch = clamp(pitch + deltaY * 0.006, -1.5, 1.5);
      };
      const handlePointerUp = (event: PointerEvent) => {
        pointerDown = false;
        canvas.style.cursor = "grab";
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Best-effort release, as above.
        }
      };
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        distance = clamp(distance + event.deltaY * 0.0025, minZoomDistance, maxZoomDistance);
      };

      canvas.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("wheel", handleWheel, { passive: false });

      if (!gl) {
        // No WebGL support (e.g. headless/test runtime) — fail closed to a
        // static (inert but structurally complete) canvas, matching this
        // package's own `magicui/core/globe.ts` fallback idiom.
        node.addHook("Remove", () => {
          disposed = true;
          canvas.removeEventListener("pointerdown", handlePointerDown);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          canvas.removeEventListener("wheel", handleWheel);
        });
        return;
      }

      const geometry = buildSphereGeometry(LATITUDE_SEGMENTS, LONGITUDE_SEGMENTS);
      const program = linkProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);

      if (!program) {
        node.addHook("Remove", () => {
          disposed = true;
          canvas.removeEventListener("pointerdown", handlePointerDown);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          canvas.removeEventListener("wheel", handleWheel);
        });
        return;
      }

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);

      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);

      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, "aPosition");
      const uvLocation = gl.getAttribLocation(program, "aUv");
      const modelUniform = gl.getUniformLocation(program, "uModel");
      const viewUniform = gl.getUniformLocation(program, "uView");
      const projectionUniform = gl.getUniformLocation(program, "uProjection");
      const baseTextureUniform = gl.getUniformLocation(program, "uBaseTexture");
      const bumpTextureUniform = gl.getUniformLocation(program, "uBumpTexture");
      const lightDirectionUniform = gl.getUniformLocation(program, "uLightDirection");
      const cameraPositionUniform = gl.getUniformLocation(program, "uCameraPosition");
      const atmosphereColorUniform = gl.getUniformLocation(program, "uAtmosphereColor");
      const ambientIntensityUniform = gl.getUniformLocation(program, "uAmbientIntensity");
      const lightIntensityUniform = gl.getUniformLocation(program, "uLightIntensity");
      const atmosphereIntensityUniform = gl.getUniformLocation(program, "uAtmosphereIntensity");

      // Placeholder 1x1 textures shown immediately; swapped for the real
      // (procedural or loaded) texture once ready, so the sphere is never
      // left un-textured while an image URL is in flight.
      let baseTexture = createFlatTexture(gl, hexToUnitFloats(themeColorToken(node, "shift-9", "info")));
      let bumpTexture = createFlatTexture(gl, [0.5, 0.5, 0.5]);

      const procedural = buildProceduralTextures(node);
      if (procedural) {
        const proceduralBase = createTextureFromSource(gl, procedural.colorCanvas);
        const proceduralBump = createTextureFromSource(gl, procedural.bumpCanvas);
        if (proceduralBase) baseTexture = proceduralBase;
        if (proceduralBump) bumpTexture = proceduralBump;
      }
      if (props.baseTextureUrl) {
        loadTextureFromUrl(gl, props.baseTextureUrl, (texture) => {
          if (!disposed) baseTexture = texture;
        });
      }
      if (props.bumpTextureUrl) {
        loadTextureFromUrl(gl, props.bumpTextureUrl, (texture) => {
          if (!disposed) bumpTexture = texture;
        });
      }

      const atmosphereRgb = hexToUnitFloats(themeColorToken(node, "shift-9", atmosphereColorFamily));

      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);

      const projectMarkerToScreen = (
        markerLatitude: number,
        markerLongitude: number,
        viewProjection: Mat4,
        model: Mat4,
        cameraPosition: [number, number, number],
        canvasWidth: number,
        canvasHeight: number,
      ): { x: number; y: number; visible: boolean } | null => {
        const [localX, localY, localZ] = latitudeLongitudeToPosition(markerLatitude, markerLongitude);
        const [worldX, worldY, worldZ] = mat4TransformPoint(model, localX, localY, localZ);
        const worldNormalLength = Math.hypot(worldX, worldY, worldZ) || 1;
        const normalX = worldX / worldNormalLength;
        const normalY = worldY / worldNormalLength;
        const normalZ = worldZ / worldNormalLength;
        const viewX = cameraPosition[0] - worldX;
        const viewY = cameraPosition[1] - worldY;
        const viewZ = cameraPosition[2] - worldZ;
        const viewLength = Math.hypot(viewX, viewY, viewZ) || 1;
        const facing = (normalX * viewX + normalY * viewY + normalZ * viewZ) / viewLength;
        if (facing < 0.05) return { x: 0, y: 0, visible: false };

        const [clipX, clipY, , clipW] = mat4TransformPoint(viewProjection, worldX, worldY, worldZ);
        if (clipW <= 0) return { x: 0, y: 0, visible: false };
        const ndcX = clipX / clipW;
        const ndcY = clipY / clipW;
        return {
          x: (ndcX * 0.5 + 0.5) * canvasWidth,
          y: (1 - (ndcY * 0.5 + 0.5)) * canvasHeight,
          visible: true,
        };
      };

      const render = () => {
        if (disposed || !gl) return;

        const displayWidth = Math.max(1, container.clientWidth);
        const displayHeight = Math.max(1, container.clientHeight);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.round(displayWidth * pixelRatio);
        const targetHeight = Math.round(displayHeight * pixelRatio);
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);

        if (autoRotate && !pointerDown) yaw += rotationSpeed;

        const model = mat4Multiply(mat4RotationY(yaw), mat4RotationX(pitch));
        const view = mat4Translation(0, 0, -distance);
        const projection = mat4Perspective((45 * Math.PI) / 180, canvas.width / canvas.height, 0.1, 100);
        const viewProjection = mat4Multiply(projection, view);
        const cameraPosition: [number, number, number] = [0, 0, distance];

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        gl.uniformMatrix4fv(modelUniform, false, model);
        gl.uniformMatrix4fv(viewUniform, false, view);
        gl.uniformMatrix4fv(projectionUniform, false, projection);
        gl.uniform3f(lightDirectionUniform, lightDirection[0], lightDirection[1], lightDirection[2]);
        gl.uniform3f(cameraPositionUniform, cameraPosition[0], cameraPosition[1], cameraPosition[2]);
        gl.uniform3f(atmosphereColorUniform, atmosphereRgb[0], atmosphereRgb[1], atmosphereRgb[2]);
        gl.uniform1f(ambientIntensityUniform, ambientIntensity);
        gl.uniform1f(lightIntensityUniform, lightIntensity);
        gl.uniform1f(atmosphereIntensityUniform, atmosphereIntensity);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, baseTexture);
        gl.uniform1i(baseTextureUniform, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, bumpTexture);
        gl.uniform1i(bumpTextureUniform, 1);

        gl.drawElements(
          wireframe ? gl.LINES : gl.TRIANGLES,
          geometry.indices.length,
          gl.UNSIGNED_SHORT,
          0,
        );

        // Re-project every marker + the hovered tooltip to 2D screen space
        // this frame, since the globe (and possibly the camera zoom) may
        // have moved since the last one.
        for (const runtime of markerRuntimes) {
          const projected = projectMarkerToScreen(
            runtime.marker.latitude,
            runtime.marker.longitude,
            viewProjection,
            model,
            cameraPosition,
            displayWidth,
            displayHeight,
          );
          if (!projected || !projected.visible) {
            runtime.element.style.opacity = "0";
            continue;
          }
          runtime.element.style.opacity = "1";
          runtime.element.style.transform = `translate(${projected.x}px, ${projected.y}px) translate(-50%, -50%)`;
        }

        if (tooltipElement) {
          const hoveredMarkerIndex = hoveredMarkerIndexState.get();
          if (hoveredMarkerIndex === null) {
            tooltipElement.style.opacity = "0";
          } else {
            const hoveredMarker = markers[hoveredMarkerIndex];
            const projected = hoveredMarker
              ? projectMarkerToScreen(
                  hoveredMarker.latitude,
                  hoveredMarker.longitude,
                  viewProjection,
                  model,
                  cameraPosition,
                  displayWidth,
                  displayHeight,
                )
              : null;
            if (projected?.visible) {
              tooltipElement.style.opacity = "1";
              tooltipElement.style.transform = `translate(${projected.x}px, ${projected.y - 28}px) translate(-50%, -100%)`;
            } else {
              tooltipElement.style.opacity = "0";
            }
          }
        }

        animationFrameHandle = window.requestAnimationFrame(render);
      };

      animationFrameHandle = window.requestAnimationFrame(render);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          /* canvas backing-store size is recomputed every frame in `render` — this observer
           * only exists so a resize is picked up promptly rather than waiting on the next
           * externally-triggered repaint. */
        });
        resizeObserver.observe(container);
      }

      node.addHook("Remove", () => {
        disposed = true;
        if (animationFrameHandle) window.cancelAnimationFrame(animationFrameHandle);
        resizeObserver?.disconnect();
        canvas.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("wheel", handleWheel);
      });
    },
  } as DomphyElement<"div">;
}

export { globe3D };
