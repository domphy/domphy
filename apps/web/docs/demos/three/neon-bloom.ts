import type { DomphyElement } from "@domphy/core";
import { effect } from "@domphy/core";
import { extend, three } from "@domphy/three";
import { Color, Vector2 } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Postprocessing classes live outside the `three` core namespace, so they
// enter user-land through extend() — same boundary orbit-viewer.ts crosses
// for OrbitControls. Unlike that recipe, none of the three end up used as a
// declarative scene tag: the composer/passes are wired up imperatively below
// (EffectComposer isn't an Object3D, so it has no natural place in `scene`).
extend({ EffectComposer, RenderPass, UnrealBloomPass });

// Three precessing wireframe rings (a loose armillary-sphere read) plus a
// floating low-poly icosahedron, all in front of a near-black backdrop.
// MeshBasicMaterial on the rings is deliberately unlit — a "neon tube" only
// needs to be bright, not shaded — so UnrealBloomPass has clean, saturated
// pixels to bloom regardless of the light rig. Each ring also carries its own
// colored pointLight as a child (rides the ring's transform), spilling that
// hue onto the icosahedron and the fog.
const RINGS = [
  {
    radius: 1.7,
    tube: 0.045,
    color: "#ff2d95",
    rotationX: 0.3,
    rotationZ: 0.1,
    speedX: 0.12,
    speedY: 0.18,
  },
  {
    radius: 1.3,
    tube: 0.04,
    color: "#2de2ff",
    rotationX: -0.4,
    rotationZ: 0.5,
    speedX: 0.16,
    speedY: -0.11,
  },
  {
    radius: 2.15,
    tube: 0.035,
    color: "#ffe32d",
    rotationX: 0.6,
    rotationZ: -0.3,
    speedX: -0.09,
    speedY: 0.14,
  },
];

const ringNodes: Record<string, any>[] = [];
for (const ring of RINGS) {
  ringNodes.push({
    mesh: [
      { torusGeometry: null, args: [ring.radius, ring.tube, 16, 100] },
      { meshBasicMaterial: null, color: ring.color, wireframe: true },
      {
        pointLight: null,
        color: ring.color,
        intensity: 70,
        distance: 6,
        position: [ring.radius * 0.8, ring.radius * 0.4, ring.radius * 0.8],
      },
    ],
    rotation: [ring.rotationX, 0, ring.rotationZ],
    // Precession: continuously spinning on two axes at once so the ring's
    // own tilt visibly wanders over time, not just a flat spin.
    onFrame: (_root, delta, self) => {
      self.rotation.x += delta * ring.speedX;
      self.rotation.y += delta * ring.speedY;
    },
  });
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
      camera: { position: [0, 1.4, 6.5], fov: 50 },
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        root.scene.background = new Color("#020308");

        // Build the render path imperatively: a plain RenderPass followed by
        // UnrealBloomPass, the standard r3f/postprocessing recipe.
        // `root.gl` is typed as the minimal `RendererLike` contract (see
        // recipes.md's injectable-renderer section) — EffectComposer wants
        // the concrete THREE.WebGLRenderer class, so the cast bridges that
        // gap the same way the WebGPURenderer recipe casts at its render()
        // boundary. The default `three()` renderer really is a
        // WebGLRenderer, so this is safe at runtime.
        const composer = new EffectComposer(root.gl as any);
        composer.addPass(new RenderPass(root.scene, root.camera));
        const bloomPass = new UnrealBloomPass(
          new Vector2(1, 1),
          1.2,
          0.4,
          0.15,
        );
        composer.addPass(bloomPass);

        // Keep the composer (and UnrealBloomPass's internal render targets)
        // sized to the canvas — root.size is a reactive State, so a bare
        // effect() re-runs this on every resize with no manual
        // ResizeObserver of our own.
        effect(() => {
          const { width, height } = root.size.get();
          composer.setSize(width, height);
        });

        // priority > 0 is render takeover (see SPEC.md / animation.md): the
        // root stops calling its own gl.render every frame once this is
        // registered, so composer.render() below is now the only thing that
        // draws a pixel. Registered directly against root.frame() here
        // rather than as a node's onFrame — the composer isn't a scene node.
        root.frame((_root, delta) => {
          composer.render(delta);
        }, 1);
      },
      scene: [
        { fog: null, args: ["#020308", 6, 16] },
        { ambientLight: null, intensity: 0.6, color: "#10131f" },
        {
          directionalLight: null,
          position: [3, 5, 4],
          intensity: 2.2,
          color: "#8891ff",
        },
        ...ringNodes,
        {
          mesh: [
            { icosahedronGeometry: null, args: [1, 0] },
            {
              meshStandardMaterial: null,
              color: "#e8ecff",
              metalness: 0.6,
              roughness: 0.25,
              emissive: "#141a2e",
              emissiveIntensity: 0.4,
            },
          ],
          onFrame: (root, delta, self) => {
            const elapsed = root.clock.getElapsedTime();
            self.position.y = Math.sin(elapsed * 0.6) * 0.35;
            self.rotation.y += delta * 0.25;
            self.rotation.x += delta * 0.1;
          },
        },
      ],
    }),
  ],
};

export default App;
