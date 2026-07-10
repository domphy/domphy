import type { DomphyElement } from "@domphy/core";
import {
  themeColor,
  themeColorToken,
  themeFluidSpacing,
  themeSpacing,
} from "@domphy/theme";
import { three } from "@domphy/three";
import { button, buttonGhost, heading, paragraph, small } from "@domphy/ui";
import { AdditiveBlending, CanvasTexture, Color } from "three";

// Landing hero: the starfield-hero example's shell pattern (three point
// layers at increasing radius, camera drift, DOM overlay in the same element
// tree) with the landing's copy — and one Domphy-specific twist: the mid
// star layer's tint is a live theme token, so toggling the site theme
// re-colors the WebGL scene through the exact same reactive path that
// re-colors the DOM around it.
interface StarLayer {
  count: number;
  innerRadius: number;
  outerRadius: number;
  size: number;
  opacity: number;
  spinSpeed: number;
}

const STAR_LAYERS: StarLayer[] = [
  {
    count: 600,
    innerRadius: 9,
    outerRadius: 22,
    size: 3.4,
    opacity: 0.95,
    spinSpeed: 0.02,
  },
  {
    count: 1000,
    innerRadius: 22,
    outerRadius: 48,
    size: 2,
    opacity: 0.85,
    spinSpeed: 0.011,
  },
  {
    count: 1500,
    innerRadius: 48,
    outerRadius: 96,
    size: 1,
    opacity: 0.6,
    spinSpeed: 0.005,
  },
];

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

const HeroBackdrop: DomphyElement<"div"> = {
  div: null,
  style: { position: "absolute", inset: 0 },
  $: [
    three({
      camera: { position: [0, 0, 0] },
      frameloop: "always",
      onCreated: (root) => {
        // Fixed cinematic backdrop inside the canvas — doctor's theme rules
        // govern style props, not three.js scene content.
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
          onFrame: (root, delta, self) => {
            self.rotation.y += delta * STAR_LAYERS[0].spinSpeed;
            self.rotation.x += delta * STAR_LAYERS[0].spinSpeed * 0.35;
            const elapsed = root.clock.getElapsedTime();
            root.camera.position.x = Math.sin(elapsed * 0.06) * 1.4;
            root.camera.position.y = Math.cos(elapsed * 0.045) * 0.9;
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
              // The Domphy twist: this WebGL material color is a live theme
              // token — the same reactive read the DOM overlay uses. Toggle
              // the site theme and the mid stars re-tint with it.
              color: (l: any) => themeColorToken(l, "shift-9", "primary"),
              size: STAR_LAYERS[1].size,
              sizeAttenuation: false,
              transparent: true,
              opacity: STAR_LAYERS[1].opacity,
              depthWrite: false,
              blending: AdditiveBlending,
            },
          ],
          onFrame: (_root: unknown, delta: number, self: any) => {
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
              color: "#5a6a9a",
              size: STAR_LAYERS[2].size,
              sizeAttenuation: false,
              transparent: true,
              opacity: STAR_LAYERS[2].opacity,
              depthWrite: false,
              blending: AdditiveBlending,
            },
          ],
          onFrame: (_root: unknown, delta: number, self: any) => {
            self.rotation.y += delta * STAR_LAYERS[2].spinSpeed;
          },
        },
        { fog: null, args: ["#03040c", 20, 95] },
      ],
    }),
  ],
};

const App: DomphyElement<"div"> = {
  div: [
    HeroBackdrop,
    {
      // DOM overlay in the SAME element tree as the canvas — no portal, no
      // iframe. dataTone gives descendants a dark surface context matching
      // the fixed canvas behind them.
      div: [
        {
          div: [
            {
              small: "Live proof — this section is one Domphy element",
              $: [small({ color: "primary" })],
            },
            { h2: "DOM and WebGL, one reactive graph", $: [heading()] },
            {
              p: "The stars are three.js points, the buttons are native elements — same plain-object tree, no portal, no iframe. The mid-layer star tint is a live theme token: flip the site theme and the WebGL scene follows.",
              $: [paragraph()],
            },
            {
              div: [
                {
                  a: "Explore @domphy/three",
                  href: "/docs/three/",
                  $: [button({ color: "primary" })],
                },
                {
                  a: "How this is built",
                  href: "/docs/three/examples/starfield-hero",
                  $: [buttonGhost()],
                },
              ],
              style: {
                display: "flex",
                gap: themeSpacing(3),
                flexWrap: "wrap",
                justifyContent: "center",
              },
            },
          ],
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: themeSpacing(4),
            maxWidth: "42em",
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
        // This element mounts bare in the page (no shadow root), so press's
        // content typography CSS (`.dp-content h2`: divider border, heading
        // color) outranks the per-node patch classes. Matching its
        // specificity here wins the tie because Domphy's style element is
        // injected after the page stylesheet.
        "& h2": {
          color: (l) => themeColor(l, "shift-12"),
          borderTop: "none",
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
        },
        "& p": {
          color: (l) => themeColor(l, "shift-10"),
          marginTop: 0,
          marginBottom: 0,
        },
        // Legibility scrim + edge vignette compositing the DOM layer onto
        // the fixed canvas color behind it (see starfield-hero example).
        backgroundImage:
          "radial-gradient(ellipse at center, rgba(3,4,12,0.55) 0%, transparent 45%, #03040c 100%)",
      },
    },
  ],
  style: {
    position: "relative",
    width: "100%",
    height: "clamp(440px, 62vh, 580px)",
    overflow: "hidden",
    borderRadius: "16px",
  },
};

export default App;
