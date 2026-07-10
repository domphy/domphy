import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import { AdditiveBlending, CanvasTexture, Color } from "three";

// 6000 points on a flat disc, each with its own slow idle orbit around a
// fixed home position (drift) plus a damped spring displacement driven by
// pointer proximity: the pointer pushes nearby points outward, a spring
// pulls them back toward their drifting home, and per-frame damping bleeds
// the kick off so they settle instead of oscillating forever. Displacement
// magnitude also drives per-point brightness (mixed toward white), so pushed
// points visibly glow.
const COUNT = 6000;
const DISC_RADIUS = 6.5;

const REPEL_RADIUS = 1.6; // world units — pointer influence falls off to 0 here
const REPEL_STRENGTH = 16; // velocity kick per second at zero distance
const SPRING = 9; // restoring acceleration per unit of displacement
const VELOCITY_DAMPING = 5; // per-second velocity bleed-off rate
const GLOW_RANGE = 1.3; // displacement magnitude that reads as fully "hot"

const innerColor = new Color("#86b1ff");
const outerColor = new Color("#e0aaff");
const mixedColor = new Color();

// Per-point static fields, precomputed once.
const baseX = new Float32Array(COUNT);
const baseZ = new Float32Array(COUNT);
const driftPhase = new Float32Array(COUNT);
const driftSpeed = new Float32Array(COUNT);
const driftRadius = new Float32Array(COUNT);
const baseColorR = new Float32Array(COUNT);
const baseColorG = new Float32Array(COUNT);
const baseColorB = new Float32Array(COUNT);

// Per-point dynamic fields, mutated every frame by onFrame below.
const velocityX = new Float32Array(COUNT);
const velocityZ = new Float32Array(COUNT);
const displacementX = new Float32Array(COUNT);
const displacementZ = new Float32Array(COUNT);

// The live GPU-facing buffers — the same array references get handed to
// `bufferAttribute` via `args` below, so mutating them here and flipping
// `needsUpdate` is all that's needed to push a new frame to the GPU.
const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);

for (let index = 0; index < COUNT; index++) {
  // sqrt(random) keeps the disc's point density uniform per unit area
  // instead of bunching up near the center.
  const radius = Math.sqrt(Math.random()) * DISC_RADIUS;
  const angle = Math.random() * Math.PI * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  baseX[index] = x;
  baseZ[index] = z;
  driftPhase[index] = Math.random() * Math.PI * 2;
  driftSpeed[index] = 0.15 + Math.random() * 0.25;
  driftRadius[index] = 0.1 + Math.random() * 0.35;

  mixedColor.copy(innerColor).lerp(outerColor, radius / DISC_RADIUS);
  baseColorR[index] = mixedColor.r;
  baseColorG[index] = mixedColor.g;
  baseColorB[index] = mixedColor.b;

  const stride = index * 3;
  positions[stride] = x;
  positions[stride + 1] = 0;
  positions[stride + 2] = z;
  colors[stride] = mixedColor.r;
  colors[stride + 1] = mixedColor.g;
  colors[stride + 2] = mixedColor.b;
}

// Soft round sprite: a radial gradient baked into a small canvas, used as
// `pointsMaterial.map` under additive blending — a flat square point would
// read as a grid of tiles instead of glowing dots.
function createSpriteTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

// World-space cursor position, updated by the invisible ground plane's
// pointer handlers below — the only DOM/canvas coordinate ever consumed;
// everything else here already lives in world space.
let pointerX = 0;
let pointerZ = 0;
let pointerActive = false;

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
      camera: { position: [0, 6, 8] },
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        root.scene.background = new Color("#05070d");
      },
      // Continuous drift + spring/damping run every tick independent of any
      // State change, so this needs "always" (the default, explicit here).
      frameloop: "always",
      scene: [
        { fog: null, args: ["#05070d", 6, 20] },
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
              map: createSpriteTexture(),
              size: 0.16,
              sizeAttenuation: true,
              vertexColors: true,
              transparent: true,
              opacity: 0.9,
              depthWrite: false,
              blending: AdditiveBlending,
            },
          ],
          onFrame: (root, delta, self) => {
            const elapsed = root.clock.getElapsedTime();
            // Linear per-second decay expressed as a per-frame multiplier —
            // framerate-independent within the delta-capping loop.ts does.
            const dampingFactor = Math.max(0, 1 - VELOCITY_DAMPING * delta);

            for (let index = 0; index < COUNT; index++) {
              const stride = index * 3;
              const targetX =
                baseX[index] +
                Math.cos(elapsed * driftSpeed[index] + driftPhase[index]) *
                  driftRadius[index];
              const targetZ =
                baseZ[index] +
                Math.sin(elapsed * driftSpeed[index] + driftPhase[index]) *
                  driftRadius[index];

              if (pointerActive) {
                const dx = targetX - pointerX;
                const dz = targetZ - pointerZ;
                const distanceSquared = dx * dx + dz * dz;
                if (distanceSquared < REPEL_RADIUS * REPEL_RADIUS) {
                  const distance = Math.sqrt(distanceSquared) || 0.001;
                  const force = (1 - distance / REPEL_RADIUS) * REPEL_STRENGTH;
                  velocityX[index] += (dx / distance) * force * delta;
                  velocityZ[index] += (dz / distance) * force * delta;
                }
              }

              // Spring pulls displacement back toward zero, damping bleeds
              // the velocity off — together they ease a repelled point back
              // to its drifting home instead of snapping or orbiting forever.
              velocityX[index] -= displacementX[index] * SPRING * delta;
              velocityZ[index] -= displacementZ[index] * SPRING * delta;
              velocityX[index] *= dampingFactor;
              velocityZ[index] *= dampingFactor;

              displacementX[index] += velocityX[index] * delta;
              displacementZ[index] += velocityZ[index] * delta;

              positions[stride] = targetX + displacementX[index];
              positions[stride + 2] = targetZ + displacementZ[index];

              const glow = Math.min(
                1,
                Math.sqrt(
                  displacementX[index] ** 2 + displacementZ[index] ** 2,
                ) / GLOW_RANGE,
              );
              colors[stride] =
                baseColorR[index] + (1 - baseColorR[index]) * glow;
              colors[stride + 1] =
                baseColorG[index] + (1 - baseColorG[index]) * glow;
              colors[stride + 2] =
                baseColorB[index] + (1 - baseColorB[index]) * glow;
            }

            self.geometry.attributes.position.needsUpdate = true;
            self.geometry.attributes.color.needsUpdate = true;
          },
        },
        // Invisible ground plane at y=0 — its only job is to turn pointer
        // moves into a world-space cursor position via the raycast hit
        // point, exactly the plane the particle disc lives on.
        {
          mesh: [
            { planeGeometry: null, args: [DISC_RADIUS * 3, DISC_RADIUS * 3] },
            {
              meshBasicMaterial: null,
              transparent: true,
              opacity: 0,
              depthWrite: false,
            },
          ],
          "rotation-x": -Math.PI / 2,
          onPointerMove: (event) => {
            pointerX = event.point.x;
            pointerZ = event.point.z;
            pointerActive = true;
          },
          onPointerOut: () => {
            pointerActive = false;
          },
        },
      ],
    }),
  ],
};

export default App;
