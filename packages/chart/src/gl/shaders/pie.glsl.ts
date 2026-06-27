import { CLIP_FROM_PIXEL } from "./common.glsl.js";

// Each pie sector is drawn as a fan of triangles from the center.
// The sector's fill is a solid color with smooth edges.
export const PIE_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

// Triangle strip covering the full disc; clipping done in FS
in vec2 aPosition;     // pixel coords

uniform vec2 uResolution;
uniform vec2 uCenter;  // pixel center
uniform float uOuterRadius;
uniform float uInnerRadius; // 0 for pie, >0 for donut

out vec2 vLocalPos;    // relative to center, in pixels

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vLocalPos = aPosition - uCenter;
}
`;

export const PIE_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec2 vLocalPos;

uniform vec4 uColor;
uniform float uStartAngle; // radians
uniform float uEndAngle;   // radians
uniform float uOuterRadius;
uniform float uInnerRadius;

out vec4 fragColor;

const float PI2 = 6.283185307179586;

void main() {
  float dist = length(vLocalPos);

  // Radial bounds
  if (dist > uOuterRadius || dist < uInnerRadius) {
    discard;
  }

  // Angle (atan2 in [-PI, PI]; shift to [0, 2PI])
  float angle = atan(vLocalPos.y, vLocalPos.x);
  if (angle < 0.0) angle += PI2;

  float start = mod(uStartAngle, PI2);
  float end   = mod(uEndAngle,   PI2);

  bool inSector;
  if (start <= end) {
    inSector = angle >= start && angle <= end;
  } else {
    // Sector wraps around 0
    inSector = angle >= start || angle <= end;
  }

  if (!inSector) discard;

  // Anti-alias outer edge
  float edgeAlpha = 1.0 - smoothstep(uOuterRadius - 1.0, uOuterRadius + 0.5, dist);
  // Anti-alias inner edge (donut)
  float innerAlpha = uInnerRadius > 0.0
    ? smoothstep(uInnerRadius - 1.0, uInnerRadius + 0.5, dist)
    : 1.0;

  fragColor = vec4(uColor.rgb, uColor.a * edgeAlpha * innerAlpha);
}
`;
