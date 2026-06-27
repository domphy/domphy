import { CLIP_FROM_PIXEL } from "./common.glsl.js";

// Per instance: position (2), radius (1), color (4) = 7 floats, stride = 28 bytes
export const SCATTER_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition;    // pixel center (per instance)
in float aRadius;     // pixel radius (per instance)
in vec4 aColor;       // rgba [0,1] (per instance)

uniform vec2 uResolution;

out vec4 vColor;
out vec2 vLocalPos; // normalized [-1, 1] within the point quad

void main() {
  // 6-vertex quad: gl_VertexID 0-5 → 2 triangles
  // 0(-1,-1), 1(1,-1), 2(-1,1), 3(1,-1), 4(1,1), 5(-1,1)
  const vec2 OFFSETS[6] = vec2[6](
    vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0,  1.0),
    vec2( 1.0, -1.0), vec2(1.0,  1.0), vec2(-1.0,  1.0)
  );

  vec2 localPos = OFFSETS[gl_VertexID];
  vec2 pixelPos = aPosition + localPos * aRadius;

  gl_Position = vec4(clipFromPixel(pixelPos, uResolution), 0.0, 1.0);
  vColor = aColor;
  vLocalPos = localPos;
}
`;

export const SCATTER_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vLocalPos;

out vec4 fragColor;

void main() {
  float dist = length(vLocalPos);
  float alpha = 1.0 - smoothstep(0.85, 1.0, dist);
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;
