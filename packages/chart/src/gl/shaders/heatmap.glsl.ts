import { CLIP_FROM_PIXEL } from "./common.glsl.js";

export const HEATMAP_VS = /* glsl */ `\
#version 300 es
${CLIP_FROM_PIXEL}

in vec2 aPosition;
in vec4 aColor;

uniform vec2 uResolution;

out vec4 vColor;

void main() {
  gl_Position = vec4(clipFromPixel(aPosition, uResolution), 0.0, 1.0);
  vColor = aColor;
}
`;

export const HEATMAP_FS = /* glsl */ `\
#version 300 es
precision highp float;

in vec4 vColor;
out vec4 fragColor;

void main() {
  fragColor = vColor;
}
`;
