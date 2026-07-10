import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import { AdditiveBlending, Color, DoubleSide } from "three";

// Shared 3D value-noise (hash + trilinear smoothstep interpolation) plus a
// cheap 2-octave fbm on top of it. Interpolated into both shader programs
// below so the mesh's dissolve edge and the point cloud's glow band sample
// the exact same density field.
const NOISE_GLSL = `
float hash3(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 cellIndex = floor(p);
  vec3 cellFraction = fract(p);
  vec3 smoothFraction = cellFraction * cellFraction * (3.0 - 2.0 * cellFraction);
  return mix(
    mix(
      mix(hash3(cellIndex + vec3(0.0, 0.0, 0.0)), hash3(cellIndex + vec3(1.0, 0.0, 0.0)), smoothFraction.x),
      mix(hash3(cellIndex + vec3(0.0, 1.0, 0.0)), hash3(cellIndex + vec3(1.0, 1.0, 0.0)), smoothFraction.x),
      smoothFraction.y),
    mix(
      mix(hash3(cellIndex + vec3(0.0, 0.0, 1.0)), hash3(cellIndex + vec3(1.0, 0.0, 1.0)), smoothFraction.x),
      mix(hash3(cellIndex + vec3(0.0, 1.0, 1.0)), hash3(cellIndex + vec3(1.0, 1.0, 1.0)), smoothFraction.x),
      smoothFraction.y),
    smoothFraction.z);
}

float fbm(vec3 p) {
  float sum = noise3(p) * 0.6;
  sum += noise3(p * 2.02) * 0.3;
  return sum / 0.9;
}
`;

// vPosition/vNormal are object-space so the noise field stays fixed to the
// geometry instead of sliding around as the group rotates.
const meshVertexShader = `
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const meshFragmentShader = `
varying vec3 vPosition;
varying vec3 vNormal;

uniform float uTime;
uniform float uThreshold;
uniform float uNoiseScale;
uniform float uEdgeWidth;
uniform vec3 uBaseColor;
uniform vec3 uGlowOuter;
uniform vec3 uGlowInner;

${NOISE_GLSL}

void main() {
  vec3 samplePoint = vPosition * uNoiseScale + vec3(0.0, uTime * 0.05, 0.0);
  float density = fbm(samplePoint);
  float edge = density - uThreshold;
  if (edge < 0.0) discard;

  // 1 right at the dissolve line, fading to 0 across uEdgeWidth.
  float glow = 1.0 - clamp(edge / uEdgeWidth, 0.0, 1.0);
  vec3 glowColor = mix(uGlowOuter, uGlowInner, glow);

  // Cheap half-lambert so the surviving shell reads as a solid instead of
  // a flat silhouette.
  vec3 lightDir = normalize(vec3(0.4, 0.8, 0.6));
  float shade = dot(vNormal, lightDir) * 0.5 + 0.5;
  vec3 baseShaded = uBaseColor * shade;

  gl_FragColor = vec4(mix(baseShaded, glowColor, glow), 1.0);
}
`;

const pointsVertexShader = `
uniform float uTime;
uniform float uThreshold;
uniform float uNoiseScale;
uniform float uEdgeWidth;

varying float vGlow;

${NOISE_GLSL}

void main() {
  vec3 samplePoint = position * uNoiseScale + vec3(0.0, uTime * 0.05, 0.0);
  float density = fbm(samplePoint);
  // Symmetric band around the threshold: points brighten as the dissolve
  // line sweeps past them, on either side, instead of just discarding.
  vGlow = 1.0 - clamp(abs(density - uThreshold) / uEdgeWidth, 0.0, 1.0);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = mix(1.0, 3.0, vGlow) * (170.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const pointsFragmentShader = `
uniform vec3 uBaseColor;
uniform vec3 uGlowColor;

varying float vGlow;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float dist = length(centered);
  if (dist > 0.5) discard;

  float alpha = mix(0.03, 0.4, vGlow) * (1.0 - smoothstep(0.3, 0.5, dist));
  gl_FragColor = vec4(mix(uBaseColor, uGlowColor, vGlow), alpha);
}
`;

// Both onFrame callbacks below evaluate this from root.clock independently
// (no shared mutable state needed) so the mesh's discard boundary and the
// point cloud's glow band always agree on where the dissolve line sits.
// Range overshoots [0, 1] a bit so both fully-solid and fully-dissolved
// states are actually reached, not just approached.
function dissolveThreshold(elapsed: number): number {
  return Math.sin(elapsed * 0.5) * 0.65 + 0.55;
}

const KNOT_ARGS = [1.1, 0.36, 200, 24] as const;

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "440px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      camera: { position: [3.4, 1.8, 3.6], fov: 45 },
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        root.scene.background = new Color("#0a0c14");
      },
      scene: [
        {
          group: [
            {
              mesh: [
                { torusKnotGeometry: null, args: KNOT_ARGS },
                {
                  shaderMaterial: null,
                  args: [
                    {
                      vertexShader: meshVertexShader,
                      fragmentShader: meshFragmentShader,
                      side: DoubleSide,
                      uniforms: {
                        uTime: { value: 0 },
                        uThreshold: { value: 0 },
                        uNoiseScale: { value: 1.6 },
                        uEdgeWidth: { value: 0.06 },
                        uBaseColor: { value: new Color("#1c2230") },
                        uGlowOuter: { value: new Color("#ff7a3c") },
                        uGlowInner: { value: new Color("#ffffdd") },
                      },
                    },
                  ],
                },
              ],
              // Drives the shared threshold straight into the compiled
              // program's uniform objects — no reactive State involved,
              // this is the imperative onFrame path (rule 2).
              onFrame: (root, _delta, self) => {
                const elapsed = root.clock.getElapsedTime();
                self.material.uniforms.uTime.value = elapsed;
                self.material.uniforms.uThreshold.value =
                  dissolveThreshold(elapsed);
              },
            },
            {
              points: [
                { torusKnotGeometry: null, args: KNOT_ARGS },
                {
                  shaderMaterial: null,
                  args: [
                    {
                      vertexShader: pointsVertexShader,
                      fragmentShader: pointsFragmentShader,
                      transparent: true,
                      depthWrite: false,
                      blending: AdditiveBlending,
                      uniforms: {
                        uTime: { value: 0 },
                        uThreshold: { value: 0 },
                        uNoiseScale: { value: 1.6 },
                        uEdgeWidth: { value: 0.1 },
                        uBaseColor: { value: new Color("#2a3550") },
                        uGlowColor: { value: new Color("#ffd9a8") },
                      },
                    },
                  ],
                },
              ],
              onFrame: (root, _delta, self) => {
                const elapsed = root.clock.getElapsedTime();
                self.material.uniforms.uTime.value = elapsed;
                self.material.uniforms.uThreshold.value =
                  dissolveThreshold(elapsed);
              },
            },
          ],
          // Slow shared spin so the dissolve/reform reads as a 3D volume
          // sweeping through the knot rather than a flat screen-space wipe.
          onFrame: (_root, delta, self) => {
            self.rotation.y += delta * 0.18;
          },
        },
      ],
    }),
  ],
};

export default App;
