import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import * as THREE from "three";

// A retro-futuristic driving grid: one large wireframe plane whose vertex
// heights come from a deterministic layered-noise function (no noise lib —
// a hashed value-noise summed across a few octaves), re-sampled every frame
// at a scrolling offset. The mesh itself never moves; only the *sampling
// coordinate* fed into the noise advances, so the terrain features appear to
// slide toward the camera forever without ever resetting or popping.
const GRID_COLOR = "#ff3caa";
const BACKDROP_COLOR = "#05010f";

const PLANE_WIDTH = 50;
const PLANE_DEPTH = 80;
const WIDTH_SEGMENTS = 50;
const DEPTH_SEGMENTS = 90;
const HEIGHT_AMPLITUDE = 2.4;
const NOISE_SCALE = 0.07;
const SCROLL_SPEED = 7; // world units per second the noise field advances

// Deterministic hash — pure function of two integers, no Math.random, so the
// terrain is reproducible frame to frame and only ever changes via the
// scroll offset onFrame adds to the sample coordinate.
function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Bilinear-interpolated value noise over the integer hash grid.
function valueNoise(x: number, y: number): number {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const fractionX = smoothStep(x - cellX);
  const fractionY = smoothStep(y - cellY);
  const bottomLeft = hash(cellX, cellY);
  const bottomRight = hash(cellX + 1, cellY);
  const topLeft = hash(cellX, cellY + 1);
  const topRight = hash(cellX + 1, cellY + 1);
  const bottom = THREE.MathUtils.lerp(bottomLeft, bottomRight, fractionX);
  const top = THREE.MathUtils.lerp(topLeft, topRight, fractionX);
  return THREE.MathUtils.lerp(bottom, top, fractionY);
}

// Three octaves of the value noise above, summed at doubling frequency and
// halving amplitude — enough layering to break up the single-frequency grid
// look into rolling, uneven hills without costing much per vertex.
function fractalNoise(x: number, y: number): number {
  let sum = 0;
  let amplitude = 0.6;
  let frequency = 1;
  let amplitudeTotal = 0;
  for (let octave = 0; octave < 3; octave++) {
    sum += valueNoise(x * frequency, y * frequency) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return sum / amplitudeTotal; // normalized to 0..1
}

function terrainHeight(x: number, sampleDepth: number): number {
  const noise = fractalNoise(x * NOISE_SCALE, sampleDepth * NOISE_SCALE);
  return (noise * 2 - 1) * HEIGHT_AMPLITUDE;
}

// Plane's local Z gets displaced into height; after the mesh's -90°
// rotation-x, local Z maps to world Y (up) and local Y maps to world -Z
// (depth), which is what lets `terrainHeight`'s second argument read as a
// "how far into the distance" sample coordinate below.
const terrainGeometry = new THREE.PlaneGeometry(
  PLANE_WIDTH,
  PLANE_DEPTH,
  WIDTH_SEGMENTS,
  DEPTH_SEGMENTS,
);
const terrainMaterial = new THREE.MeshBasicMaterial({
  color: GRID_COLOR,
  wireframe: true,
  transparent: true,
  opacity: 0.9,
});
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.rotation.x = -Math.PI / 2;
// Shift the plane so its near edge sits just in front of the camera and its
// far edge trails off well past the fog's far distance — the fog does the
// job of hiding the (now pointless) extra vertices out there.
terrain.position.z = -(PLANE_DEPTH / 2) + 3;

let scrollOffset = 0;

// Classic "sliced sun" gradient disc: a vertical multi-stop gradient (hot
// core fading through magenta into deep violet) with a handful of growing
// horizontal gaps punched through the lower half via destination-out
// compositing, exposing the transparent canvas behind — the retro sun
// silhouette, built with 2D canvas instead of a hand-written shader.
function buildSunTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, "#fff9c4");
    gradient.addColorStop(0.32, "#ffb84d");
    gradient.addColorStop(0.62, "#ff3caa");
    gradient.addColorStop(1, "#7b2ff7");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = "destination-out";
    let stripeY = size * 0.52;
    let stripeHeight = 4;
    let stripeGap = 6;
    while (stripeY < size) {
      context.fillRect(0, stripeY, size, stripeHeight);
      stripeY += stripeHeight + stripeGap;
      stripeHeight += 2;
      stripeGap += 3;
    }
    context.globalCompositeOperation = "source-over";
  }
  return new THREE.CanvasTexture(canvas);
}

const sunTexture = buildSunTexture();

// Sparse points scattered above the horizon only — a subtle sky backdrop,
// not a teaching subject of its own, so no color/twinkle variation.
const STAR_COUNT = 260;
function buildStarPositions(): Float32Array {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let index = 0; index < STAR_COUNT; index++) {
    const stride = index * 3;
    positions[stride] = (Math.random() - 0.5) * 90;
    positions[stride + 1] = 5 + Math.random() * 26;
    positions[stride + 2] = -10 - Math.random() * 60;
  }
  return positions;
}
const starPositions = buildStarPositions();

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
      camera: { position: [0, 2, 8], fov: 62 },
      onCreated: (root) => {
        root.camera.lookAt(0, 0.6, -20);
        root.scene.background = new THREE.Color(BACKDROP_COLOR);
      },
      // Free-running scroll animation, not driven by any reactive prop —
      // needs "always" so onFrame keeps ticking with nothing to invalidate().
      frameloop: "always",
      scene: [
        { fog: null, args: [BACKDROP_COLOR, 8, 46] },

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
              // fog: false — stars sit above the ground haze, unaffected by
              // it, unlike the terrain and the sun's own atmospheric fade.
              pointsMaterial: null,
              color: "#eaf2ff",
              size: 1.6,
              sizeAttenuation: false,
              transparent: true,
              opacity: 0.55,
              depthWrite: false,
              fog: false,
            },
          ],
        },

        {
          mesh: [
            { circleGeometry: null, args: [7, 64] },
            {
              // fog: false — the sun is a glowing light source above the
              // fog band, not ground geometry the haze should dim.
              meshBasicMaterial: null,
              map: sunTexture,
              transparent: true,
              depthWrite: false,
              fog: false,
            },
          ],
          position: [0, 4.2, -46],
        },

        // The animated mesh is built imperatively (per-frame position
        // attribute rewrite isn't expressible through declarative args/props),
        // so it's adopted via `primitive` — same recipe as wave-field.ts.
        {
          primitive: null,
          object: terrain,
          onFrame: (_root, delta, self) => {
            scrollOffset += delta * SCROLL_SPEED;
            const positionAttribute = self.geometry.attributes
              .position as THREE.BufferAttribute;
            const vertexCount = positionAttribute.count;
            for (let vertex = 0; vertex < vertexCount; vertex++) {
              const x = positionAttribute.getX(vertex);
              const localDepth = positionAttribute.getY(vertex);
              positionAttribute.setZ(
                vertex,
                terrainHeight(x, localDepth + scrollOffset),
              );
            }
            // Wireframe + unlit material never reads normals, so
            // computeVertexNormals() is skipped — only the GPU-side buffer
            // upload flag is needed to see the rewritten heights.
            positionAttribute.needsUpdate = true;
          },
        },
      ],
    }),
  ],
};

export default App;
