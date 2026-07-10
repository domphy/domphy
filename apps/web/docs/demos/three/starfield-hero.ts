import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeFluidSpacing, themeSpacing } from "@domphy/theme";
import { three } from "@domphy/three";
import { button, heading, paragraph, small } from "@domphy/ui";
import { AdditiveBlending, CanvasTexture, Color } from "three";

// Three concentric shells of points at increasing radius/decreasing size —
// the classic "flying through space" depth trick: each shell spins at its
// own rate in onFrame, so nearer (faster, brighter) stars visibly slide past
// farther (slower, dimmer) ones even though nothing ever changes position
// relative to its own shell. Layer 0 is the only one built from per-point
// vertex colors (a warm/cool twinkle scattered through the warm-white base)
// — it's the layer close enough to read, so it's the one worth the detail.
interface StarLayer {
  count: number;
  innerRadius: number;
  outerRadius: number;
  size: number;
  color: string;
  opacity: number;
  spinSpeed: number;
}

// `size` is in screen pixels (sizeAttenuation: false below) rather than
// world units — a starfield reads as points of light, not physically-scaled
// objects, so a fixed on-screen size per shell is both simpler and more
// legible than one that shrinks with camera distance.
const STAR_LAYERS: StarLayer[] = [
  // Layer 0's `color` is unused by its own pointsMaterial (vertexColors:
  // true drives its base warm-white/twinkle mix instead, see
  // buildTwinkleColors below) — kept here only so every layer shares the
  // same table shape.
  {
    count: 700,
    innerRadius: 9,
    outerRadius: 22,
    size: 3.6,
    color: "#eaf2ff",
    opacity: 0.95,
    spinSpeed: 0.02,
  },
  {
    count: 1100,
    innerRadius: 22,
    outerRadius: 48,
    size: 2,
    color: "#b9c6ff",
    opacity: 0.85,
    spinSpeed: 0.011,
  },
  {
    count: 1700,
    innerRadius: 48,
    outerRadius: 96,
    size: 1,
    color: "#5a6a9a",
    opacity: 0.65,
    spinSpeed: 0.005,
  },
];

// Uniform random point on a spherical shell between innerRadius/outerRadius
// (acos(2u-1) for the polar angle keeps the distribution even across the
// sphere's surface, not bunched at the poles).
function buildShellPositions(
  count: number,
  innerRadius: number,
  outerRadius: number,
): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const stride = index * 3;
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[stride] = radius * Math.sin(phi) * Math.cos(theta);
    positions[stride + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[stride + 2] = radius * Math.cos(phi);
  }
  return positions;
}

const baseWhite = new Color("#eaf2ff");
const warmTwinkle = new Color("#ffd9a8");
const coolTwinkle = new Color("#bcd4ff");
const twinkleColor = new Color();

// Most points stay warm-white; a scattered minority lean warm or cool, the
// same trick real starfield photos read as — a few visibly tinted stars
// among a field of white-ish ones.
function buildTwinkleColors(count: number): Float32Array {
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const stride = index * 3;
    const twinkle = Math.random();
    twinkleColor.copy(baseWhite);
    if (twinkle < 0.12) twinkleColor.lerp(warmTwinkle, 0.6);
    else if (twinkle > 0.88) twinkleColor.lerp(coolTwinkle, 0.6);
    colors[stride] = twinkleColor.r;
    colors[stride + 1] = twinkleColor.g;
    colors[stride + 2] = twinkleColor.b;
  }
  return colors;
}

// Soft round glow sprite (radial gradient, opaque center fading to
// transparent edge) applied as `map` on every shell's pointsMaterial —
// combined with AdditiveBlending this reads as a glowing point of light
// instead of PointsMaterial's default flat, hard-edged square dot.
function buildGlowSprite(): CanvasTexture {
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
    gradient.addColorStop(0.4, "rgba(255,255,255,0.4)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

const glowSprite = buildGlowSprite();

const nearPositions = buildShellPositions(
  STAR_LAYERS[0].count,
  STAR_LAYERS[0].innerRadius,
  STAR_LAYERS[0].outerRadius,
);
const nearColors = buildTwinkleColors(STAR_LAYERS[0].count);
const midPositions = buildShellPositions(
  STAR_LAYERS[1].count,
  STAR_LAYERS[1].innerRadius,
  STAR_LAYERS[1].outerRadius,
);
const farPositions = buildShellPositions(
  STAR_LAYERS[2].count,
  STAR_LAYERS[2].innerRadius,
  STAR_LAYERS[2].outerRadius,
);

// Clicking the CTA below feeds this — a pierced/reactive prop bridging a DOM
// event to the canvas, read untracked every frame the same way
// interactive-grid.ts's pulseId pattern does (no listener needed since
// onFrame already runs every tick).
const warp = toState(0);
let lastWarpCount = 0;
let warpElapsed = 1000; // large finite -> exp(-huge) underflows to 0, no NaN

const App: DomphyElement<"div"> = {
  div: [
    {
      // The canvas layer — position:absolute set directly on this element
      // wins over the three() patch's own `position: relative` default, so
      // it stretches to fill the wrapper below instead of sizing to content.
      div: null,
      style: { position: "absolute", inset: 0 },
      $: [
        three({
          camera: { position: [0, 0, 0] },
          frameloop: "always", // free-running drift, nothing ever calls invalidate()
          onCreated: (root) => {
            // Fixed cinematic backdrop rendered inside the canvas, not a DOM
            // element — doctor's theme-color rules govern style props, not
            // three.js scene content.
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
                      args: [nearPositions, 3],
                    },
                    {
                      bufferAttribute: null,
                      attach: "attributes-color",
                      args: [nearColors, 3],
                    },
                  ],
                },
                {
                  pointsMaterial: null,
                  map: glowSprite,
                  size: STAR_LAYERS[0].size,
                  sizeAttenuation: false,
                  vertexColors: true,
                  transparent: true,
                  opacity: STAR_LAYERS[0].opacity,
                  depthWrite: false,
                  blending: AdditiveBlending,
                },
              ],
              // The one onFrame doing double duty: spins this shell AND
              // drives the whole camera's slow float/pan, plus a brief
              // forward "warp" dash whenever `warp` ticks (see the button
              // below) — same pulse-on-change technique interactive-grid.ts
              // uses for its click bump, applied to camera position instead
              // of scale.
              onFrame: (root, delta, self) => {
                self.rotation.y += delta * STAR_LAYERS[0].spinSpeed;
                self.rotation.x += delta * STAR_LAYERS[0].spinSpeed * 0.35;

                const warpCount = warp.get();
                if (warpCount !== lastWarpCount) {
                  lastWarpCount = warpCount;
                  warpElapsed = 0;
                } else {
                  warpElapsed += delta;
                }
                const warpDash = Math.exp(-warpElapsed * 2.5) * 5;

                const elapsed = root.clock.getElapsedTime();
                root.camera.position.x = Math.sin(elapsed * 0.06) * 1.4;
                root.camera.position.y = Math.cos(elapsed * 0.045) * 0.9;
                root.camera.position.z = -warpDash;
                root.camera.lookAt(
                  Math.sin(elapsed * 0.05) * 3.5,
                  Math.cos(elapsed * 0.04) * 1.8,
                  -50,
                );
              },
            },
            {
              points: [
                {
                  bufferGeometry: [
                    {
                      bufferAttribute: null,
                      attach: "attributes-position",
                      args: [midPositions, 3],
                    },
                  ],
                },
                {
                  pointsMaterial: null,
                  map: glowSprite,
                  color: STAR_LAYERS[1].color,
                  size: STAR_LAYERS[1].size,
                  sizeAttenuation: false,
                  transparent: true,
                  opacity: STAR_LAYERS[1].opacity,
                  depthWrite: false,
                  blending: AdditiveBlending,
                },
              ],
              onFrame: (_root, delta, self) => {
                self.rotation.y += delta * STAR_LAYERS[1].spinSpeed;
              },
            },
            {
              points: [
                {
                  bufferGeometry: [
                    {
                      bufferAttribute: null,
                      attach: "attributes-position",
                      args: [farPositions, 3],
                    },
                  ],
                },
                {
                  pointsMaterial: null,
                  map: glowSprite,
                  color: STAR_LAYERS[2].color,
                  size: STAR_LAYERS[2].size,
                  sizeAttenuation: false,
                  transparent: true,
                  opacity: STAR_LAYERS[2].opacity,
                  depthWrite: false,
                  blending: AdditiveBlending,
                },
              ],
              onFrame: (_root, delta, self) => {
                self.rotation.y += delta * STAR_LAYERS[2].spinSpeed;
              },
            },
            // Depth cue: fog starts just past the near shell and reaches
            // full strength at the far shell's outer radius, so the far
            // shell visibly dissolves into the `#03040c` backdrop instead of
            // just reading as small and dim.
            { fog: null, args: ["#03040c", 20, 95] },
          ],
        }),
      ],
    },
    {
      // DOM overlay, composited straight on top of the canvas via absolute
      // positioning — same host element tree, no portal/iframe trickery.
      // dataTone establishes a dark surface context for every descendant
      // (heading()/paragraph()/small()/button() all read their color off
      // this ambient tone automatically), matching the fixed dark canvas
      // behind it.
      div: [
        {
          div: [
            { small: "@domphy/three", $: [small({ color: "primary" })] },
            { h1: "A universe you can read top to bottom", $: [heading()] },
            {
              p: "No JSX, no virtual DOM. Meshes, lights, and cameras compose the same way a page does — plain objects with reactive props, patched straight onto a canvas.",
              $: [paragraph()],
            },
            {
              button: "Explore the grammar",
              onClick: () => warp.set(warp.get() + 1),
              $: [button({ color: "primary" })],
            },
          ],
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: themeSpacing(4),
            maxWidth: "40em",
            textAlign: "center",
          },
        },
      ],
      dataTone: "shift-16",
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: themeFluidSpacing(6, 14),
        backgroundColor: "transparent",
        color: (l) => themeColor(l, "shift-9"),
        // Two-layer composite tying the DOM layer to the fixed canvas
        // backdrop behind it — not a themed surface, a literal match to
        // that fixed color (backgroundImage isn't a doctor-scanned color
        // prop, deliberately; this is compositing with WebGL content, not a
        // UI surface). The linear scrim is a legibility floor so headline
        // and CTA stay readable even when bright stars drift behind them;
        // the radial vignette on top of it softens the canvas edges.
        backgroundImage:
          "linear-gradient(to right, rgba(3,4,12,0.85), transparent), radial-gradient(ellipse at center, transparent 35%, #03040c 100%)",
      },
    },
  ],
  style: {
    position: "relative",
    width: "100%",
    height: "620px",
    overflow: "hidden",
    borderRadius: "16px",
  },
};

export default App;
