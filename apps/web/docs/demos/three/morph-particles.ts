import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import {
  AdditiveBlending,
  Color,
  SphereGeometry,
  TorusKnotGeometry,
} from "three";

// Three target shapes for an 8000-point cloud to morph between. Sphere and
// torus knot targets are sampled from real THREE geometries' position
// attributes — evenly-spaced indices across each geometry's vertex buffer
// (not a contiguous slice), so the sample spreads across the whole surface
// regardless of how COUNT compares to the source vertex count. The spiral
// has no equivalent built-in geometry, so it's generated directly as a
// parametric target of the same shape (angle/radius/height per index).
const COUNT = 8000;

function sampleGeometryPositions(
  source: Float32Array,
  count: number,
): Float32Array {
  const vertexCount = source.length / 3;
  const target = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const sourceIndex = Math.floor((index / count) * vertexCount);
    const sourceStride = sourceIndex * 3;
    const stride = index * 3;
    target[stride] = source[sourceStride];
    target[stride + 1] = source[sourceStride + 1];
    target[stride + 2] = source[sourceStride + 2];
  }
  return target;
}

const spherePositions = sampleGeometryPositions(
  new SphereGeometry(2.2, 96, 96).attributes.position.array as Float32Array,
  COUNT,
);
const torusKnotPositions = sampleGeometryPositions(
  new TorusKnotGeometry(1.3, 0.42, 400, 32).attributes.position
    .array as Float32Array,
  COUNT,
);

const SPIRAL_TURNS = 10;
const SPIRAL_MAX_RADIUS = 2.1;
const SPIRAL_HEIGHT = 4.4;
const spiralPositions = new Float32Array(COUNT * 3);
for (let index = 0; index < COUNT; index++) {
  const stride = index * 3;
  const t = index / COUNT;
  const angle = t * Math.PI * 2 * SPIRAL_TURNS;
  const radius = 0.25 + t * SPIRAL_MAX_RADIUS;
  spiralPositions[stride] = Math.cos(angle) * radius;
  spiralPositions[stride + 1] = (t - 0.5) * SPIRAL_HEIGHT;
  spiralPositions[stride + 2] = Math.sin(angle) * radius;
}

interface ShapeTarget {
  positions: Float32Array;
  color: Color;
}

const SHAPES: ShapeTarget[] = [
  { positions: spherePositions, color: new Color("#66aaff") },
  { positions: torusKnotPositions, color: new Color("#ff7a3c") },
  { positions: spiralPositions, color: new Color("#b76cff") },
];

// Deterministic pseudo-random unit value from an index — no Math.random
// reuse at runtime, this only ever runs once while building the stagger
// table below.
function hashUnit(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Per-particle transition delay, spread across MAX_STAGGER seconds — this is
// what makes a shape switch ripple outward through the cloud instead of
// every point snapping into place in lockstep.
const MAX_STAGGER = 0.7;
const EASE_DURATION = 0.9; // each particle's own ease-in-out window, once its delay elapses
const TRANSITION_WINDOW = EASE_DURATION + MAX_STAGGER; // worst-case time for the last particle to settle
const CYCLE_INTERVAL = 4; // seconds between auto-advances

const staggerDelays = new Float32Array(COUNT);
for (let index = 0; index < COUNT; index++)
  staggerDelays[index] = hashUnit(index) * MAX_STAGGER;

// Live buffers fed straight into bufferAttribute below — onFrame mutates
// these in place and flips needsUpdate, same pattern as wave-field.ts's
// InstancedMesh matrix rewrite.
const positions = new Float32Array(SHAPES[0].positions);
const colors = new Float32Array(COUNT * 3);
for (let index = 0; index < COUNT; index++) {
  const stride = index * 3;
  colors[stride] = SHAPES[0].color.r;
  colors[stride + 1] = SHAPES[0].color.g;
  colors[stride + 2] = SHAPES[0].color.b;
}

// Snapshots captured at the start of each transition — sampling from
// whatever `positions`/`colors` actually hold right now (not necessarily a
// settled shape) lets an early click interrupt a transition already in
// flight without a visible snap.
const fromPositions = new Float32Array(positions);
const fromColors = new Float32Array(colors);

let activeShapeIndex = 0;
let transitionElapsed = TRANSITION_WINDOW; // start fully settled, no transition in flight
let cycleElapsed = 0;

function beginTransition(nextShapeIndex: number): void {
  fromPositions.set(positions);
  fromColors.set(colors);
  activeShapeIndex = nextShapeIndex;
  transitionElapsed = 0;
  cycleElapsed = 0;
}

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
      camera: { position: [4.2, 2.4, 5.6], fov: 50 },
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        // Fixed cinematic backdrop rendered inside the canvas, not a DOM
        // element, so doctor's raw-theme-value rule doesn't apply here.
        root.scene.background = new Color("#05060f");
      },
      // The idle spin and the auto-cycle timer both run every tick
      // regardless of any State change, so "demand" would leave the cycle
      // frozen — "always" (the default, made explicit) is required here.
      frameloop: "always",
      scene: [
        { fog: null, args: ["#05060f", 6, 16] },
        {
          points: [
            {
              bufferGeometry: [
                {
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
              size: 0.045,
              sizeAttenuation: true,
              vertexColors: true,
              transparent: true,
              opacity: 0.85,
              depthWrite: false,
              blending: AdditiveBlending,
            },
          ],
          onFrame: (_root, delta, self) => {
            self.rotation.y += delta * 0.05;

            cycleElapsed += delta;
            if (cycleElapsed >= CYCLE_INTERVAL) {
              beginTransition((activeShapeIndex + 1) % SHAPES.length);
            }

            if (transitionElapsed >= TRANSITION_WINDOW) return; // fully settled, nothing to write

            transitionElapsed += delta;
            const target = SHAPES[activeShapeIndex];
            const targetPositions = target.positions;
            const targetColor = target.color;

            for (let index = 0; index < COUNT; index++) {
              const stride = index * 3;
              const localElapsed = transitionElapsed - staggerDelays[index];
              const eased = easeInOutCubic(
                Math.min(1, Math.max(0, localElapsed / EASE_DURATION)),
              );

              positions[stride] =
                fromPositions[stride] +
                (targetPositions[stride] - fromPositions[stride]) * eased;
              positions[stride + 1] =
                fromPositions[stride + 1] +
                (targetPositions[stride + 1] - fromPositions[stride + 1]) *
                  eased;
              positions[stride + 2] =
                fromPositions[stride + 2] +
                (targetPositions[stride + 2] - fromPositions[stride + 2]) *
                  eased;

              colors[stride] =
                fromColors[stride] +
                (targetColor.r - fromColors[stride]) * eased;
              colors[stride + 1] =
                fromColors[stride + 1] +
                (targetColor.g - fromColors[stride + 1]) * eased;
              colors[stride + 2] =
                fromColors[stride + 2] +
                (targetColor.b - fromColors[stride + 2]) * eased;
            }

            self.geometry.attributes.position.needsUpdate = true;
            self.geometry.attributes.color.needsUpdate = true;
          },
        },
        // Invisible bounds sphere so a click anywhere near the cloud
        // registers, without the particles themselves needing an onClick
        // (which would raycast per-point across 8000 points on every
        // pointer move).
        {
          mesh: [
            { sphereGeometry: null, args: [6, 16, 16] },
            {
              meshBasicMaterial: null,
              transparent: true,
              opacity: 0,
              depthWrite: false,
            },
          ],
          onClick: () => {
            beginTransition((activeShapeIndex + 1) % SHAPES.length);
          },
        },
      ],
    }),
  ],
};

export default App;
