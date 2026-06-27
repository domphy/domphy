import { CLIP_FROM_PIXEL } from "./common.glsl.js";

// Per-instance attributes: barX, barY, barW, barH (pixel coords), color rgba
export const BAR_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

// Unit quad vertex position [0,1] x [0,1]
in vec2 position;

// Per-instance: rect in pixel space (x, y, width, height) + rgba color
in vec4 instanceRect;    // x, y, w, h in pixels (y = top)
in vec4 instanceColor;   // rgba [0,1]
in float instanceRadius; // border-radius in pixels

uniform vec2 uResolution;

out vec4 vColor;
out vec2 vPixelPos;  // position within the rect
out vec4 vRect;      // pixel rect (x, y, w, h)
out float vRadius;

void main() {
  vec2 pixelPos = instanceRect.xy + position * instanceRect.zw;
  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = instanceColor;
  vPixelPos = position * instanceRect.zw; // local position within rect
  vRect = instanceRect;
  vRadius = instanceRadius;
}
`;

export const BAR_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vPixelPos;
in vec4 vRect;
in float vRadius;

out vec4 fragColor;

// Rounded-rect SDF for anti-aliased corners
float roundedBoxSDF(vec2 pos, vec2 size, float radius) {
  vec2 q = abs(pos - size * 0.5) - size * 0.5 + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  float sdf = roundedBoxSDF(vPixelPos, vRect.zw, vRadius);
  float alpha = 1.0 - smoothstep(-0.5, 0.5, sdf);
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;
