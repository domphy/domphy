// Shared GLSL utilities injected into shaders via string concatenation
export const CLIP_FROM_PIXEL = /* glsl */ `
// Converts pixel coords (origin top-left, y down) to clip space [-1, 1]
vec2 clipFromPixel(vec2 pixel, vec2 resolution) {
  return vec2(
    (pixel.x / resolution.x) * 2.0 - 1.0,
    1.0 - (pixel.y / resolution.y) * 2.0
  );
}
`;
