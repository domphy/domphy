import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import { AdditiveBlending, Color } from "three";

// Classic "threejs-journey" galaxy generator, adapted to plain typed arrays
// fed straight into `bufferAttribute` nodes: points cluster tight along spiral
// branches near the core and scatter wider toward the rim, colored on a
// warm-core -> cool-rim gradient. A faint distant starfield sits behind it
// purely for scale contrast (no teaching content of its own).
const COUNT = 15000;
const RADIUS = 5;
const BRANCHES = 3;
const SPIN = 1;
const RANDOMNESS = 0.35;
const RANDOMNESS_POWER = 3;

const insideColor = new Color("#ffcc66"); // warm core
const rimColorA = new Color("#4d7bff"); // cool rim, even branches
const rimColorB = new Color("#7b5cff"); // cool rim, odd branches
const mixedColor = new Color();

const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);

// Scatter magnitude grows with radius and shrinks near the core (the
// `** RANDOMNESS_POWER` term), so points hug the branch lines tightly at the
// center and spread out into a loose halo toward the edge.
function scatter(radius: number): number {
  const sign = Math.random() < 0.5 ? 1 : -1;
  return sign * Math.random() ** RANDOMNESS_POWER * RANDOMNESS * radius;
}

for (let index = 0; index < COUNT; index++) {
  const stride = index * 3;
  const radius = Math.random() * RADIUS;
  const branch = index % BRANCHES;
  const branchAngle = (branch / BRANCHES) * Math.PI * 2;
  const spinAngle = radius * SPIN;

  positions[stride] =
    Math.cos(branchAngle + spinAngle) * radius + scatter(radius);
  positions[stride + 1] = scatter(radius) * 0.4; // flatten into a disc
  positions[stride + 2] =
    Math.sin(branchAngle + spinAngle) * radius + scatter(radius);

  // Alternate the rim hue by branch (blue/purple) so the arms read as
  // distinct sweeps instead of one flat gradient ring.
  mixedColor
    .copy(insideColor)
    .lerp(branch % 2 === 0 ? rimColorA : rimColorB, radius / RADIUS);
  colors[stride] = mixedColor.r;
  colors[stride + 1] = mixedColor.g;
  colors[stride + 2] = mixedColor.b;
}

// Sparse, faraway points scattered on a thick shell around the galaxy —
// low opacity and no additive blending, so they read as background stars
// giving the spiral a sense of scale without competing with it.
const STARFIELD_COUNT = 900;
const STARFIELD_RADIUS = 40;
const starPositions = new Float32Array(STARFIELD_COUNT * 3);
for (let index = 0; index < STARFIELD_COUNT; index++) {
  const stride = index * 3;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = STARFIELD_RADIUS * (0.55 + Math.random() * 0.45);
  starPositions[stride] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[stride + 1] = radius * Math.cos(phi);
  starPositions[stride + 2] = radius * Math.sin(phi) * Math.sin(theta);
}

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "420px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      // Elevated ~25° above the galactic plane (atan(3/6.5) ≈ 25°) rather
      // than a dead top-down shot, so the spiral arms and disc thickness
      // both read.
      camera: { position: [0, 3, 6.5] },
      // A fixed cinematic backdrop lives inside the canvas, so doctor's
      // theme-color rules (which govern DOM elements) don't apply here.
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        root.scene.background = new Color("#03040c");
      },
      scene: [
        {
          points: [
            {
              bufferGeometry: [
                {
                  bufferAttribute: null,
                  attach: "attributes-position",
                  args: [starPositions, 3],
                },
              ],
            },
            {
              pointsMaterial: null,
              size: 0.05,
              sizeAttenuation: true,
              color: "#9fb4ff",
              transparent: true,
              opacity: 0.35,
              depthWrite: false,
            },
          ],
        },
        {
          points: [
            {
              bufferGeometry: [
                {
                  // No isBufferAttribute-style inference exists for
                  // bufferAttribute, so `attach` is always explicit here —
                  // relative to the parent bufferGeometry instance, this
                  // writes `geometry.attributes.position`.
                  bufferAttribute: null,
                  attach: "attributes-position",
                  args: [positions, 3],
                },
                {
                  bufferAttribute: null,
                  attach: "attributes-color",
                  args: [colors, 3],
                },
              ],
            },
            {
              pointsMaterial: null,
              size: 0.04,
              sizeAttenuation: true,
              vertexColors: true,
              depthWrite: false,
              transparent: true,
              // opacity < 1 caps how bright overlapping additive points can
              // stack, so the dense core glows warm instead of blowing out
              // to flat white.
              opacity: 0.82,
              blending: AdditiveBlending,
            },
          ],
          // Slow continuous spiral rotation (visible arm sweep/parallax
          // frame to frame), plus a subtle camera drift/re-aim every
          // frame — cheap enough at 15k points to run unconditionally.
          onFrame: (root, delta, self) => {
            self.rotation.y += delta * 0.06;
            const elapsed = root.clock.getElapsedTime();
            root.camera.position.x = Math.sin(elapsed * 0.05) * 0.8;
            root.camera.position.y = 3 + Math.sin(elapsed * 0.08) * 0.2;
            root.camera.lookAt(0, 0, 0);
          },
        },
      ],
    }),
  ],
};

export default App;
