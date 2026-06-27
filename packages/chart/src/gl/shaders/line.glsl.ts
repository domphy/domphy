import { CLIP_FROM_PIXEL } from "./common.glsl.js";

// Renders a polyline as a screen-space quad strip with rounded joins/caps.
// Each vertex carries the segment direction for the miter join computation.
export const LINE_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

// Packed: current point (xy), previous direction (zw) — pixel space
in vec4 aPointDir;
// Normal side: -1 or +1
in float aSide;
// Per-series uniforms
uniform vec2 uResolution;
uniform float uLineWidth; // half-width in pixels
uniform vec4 uColor;

out vec4 vColor;
out float vSide;  // for cap/join SDF
out vec2 vUV;

void main() {
  vec2 point = aPointDir.xy;
  vec2 dir   = aPointDir.zw; // unit direction along segment

  // Perpendicular normal
  vec2 normal = vec2(-dir.y, dir.x);

  vec2 offset = normal * aSide * uLineWidth;
  vec2 pixelPos = point + offset;

  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = uColor;
  vSide  = aSide;
  vUV    = vec2(gl_VertexID, aSide);
}
`;

export const LINE_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec4 vColor;
in float vSide;

out vec4 fragColor;

void main() {
  // vSide interpolates -1 → +1 across the line width; fade outer ~0.5px for AA
  float edge = 1.0 - smoothstep(0.85, 1.0, abs(vSide));
  fragColor = vec4(vColor.rgb, vColor.a * edge);
}
`;

// ─── Area fill variant ────────────────────────────────────────────────────────
// Simple triangle fill between the line and a baseline y value
export const AREA_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition; // pixel space
uniform vec2 uResolution;
uniform vec4 uColor;

out vec4 vColor;

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vColor = uColor;
}
`;

export const AREA_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
  fragColor = vColor;
}
`;
