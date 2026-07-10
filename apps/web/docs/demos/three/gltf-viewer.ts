import type { DomphyElement } from "@domphy/core";
import { extend, loadAsset, three } from "@domphy/three";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// OrbitControls lives outside the `three` core namespace, so it enters
// user-land through extend() — the package itself never imports it.
extend({ OrbitControls });

interface DuckGLTF {
  scene: THREE.Object3D;
}

// Cache key is GLTFLoader + this url — call loadAsset() again anywhere with
// the same pair and you get back this exact AssetResult.
const duck = loadAsset<DuckGLTF>(GLTFLoader, "/models/Duck.glb");

// Raw glTF assets don't come pre-normalized to any particular scale or
// ground position. Runs once (guarded by userData) the first time the
// loaded scene is adopted, so re-renders never re-measure it.
function fitDuck(self: THREE.Object3D) {
  if (self.userData.fitted) return;
  const box = new THREE.Box3().setFromObject(self);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2.6 / (Math.max(size.x, size.y, size.z) || 1);
  self.scale.setScalar(scale);
  self.position.set(-center.x * scale, -box.min.y * scale - 1, -center.z * scale);
  self.userData.fitted = true;
}

// The duck's beak/eye only read from roughly this side — a camera parked
// straight down the +Z axis lands on the shapeless back of its head. Target
// is [0, 0.3, 0], so this position's own x/z double as its azimuth around
// the model. The OrbitControls clamp below is derived from this constant
// (rather than a separate hardcoded angle) so the "resting" view and the
// drag limits can never drift out of sync with each other.
const CAMERA_START: [number, number, number] = [4.4, 2.3, -3.4];
const FRONT_AZIMUTH = Math.atan2(CAMERA_START[0], CAMERA_START[2]);
const AZIMUTH_SWING = (40 * Math.PI) / 180;

// Soft radial-falloff contact shadow, baked once into a small canvas texture
// instead of a real shadow map — cheap, and the falloff alone is enough to
// read as "sitting on the ground" rather than floating in the vignette.
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const contactShadowTexture = createContactShadowTexture();

const App: DomphyElement<"div"> = {
  div: [
    {
      // Vignette overlay, composited on top of the canvas by CSS stacking
      // alone (an absolutely positioned sibling paints above the plain,
      // statically positioned canvas — no z-index needed). pointerEvents:
      // "none" lets OrbitControls' drag still reach the canvas underneath.
      // backgroundImage isn't a doctor-scanned color prop, deliberately —
      // this is compositing with WebGL content, not a themed UI surface
      // (same technique as starfield-hero.ts).
      div: null,
      style: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "radial-gradient(ellipse at center, transparent 40%, #02030a 100%)",
      },
    },
  ],
  style: {
    position: "relative",
    width: "100%",
    height: "440px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      // Always mode: the loading-state placeholder spins continuously via
      // onFrame (time-based, not event-driven), so it needs a frame every
      // tick regardless of user input — see frameloop modes in
      // /docs/three/animation. Once the model loads, OrbitControls' own
      // onChange -> invalidate would be enough on its own, but the
      // placeholder's animation is why this scene stays on "always"
      // instead of switching to "demand". It also means autoRotate below
      // gets its self.update() call every tick for free.
      frameloop: "always",
      camera: { position: CAMERA_START, fov: 42 },
      scene: (l) => {
        const gltf = duck.data.get(l);
        return [
          // Studio backdrop: dark background + fog via attach inference —
          // same mechanism a mesh child's geometry/material uses.
          { color: null, attach: "background", args: ["#0b0e14"] },
          { fog: null, args: ["#0b0e14", 6, 20] },

          // Hemisphere sky/ground bounce so the duck never reads as
          // flat-lit, plus a two-point rig carving the form: a warm key
          // from camera-right-above and a cool rim from camera-left so the
          // silhouette still reads even off-angle.
          { hemisphereLight: null, args: ["#bcd2ff", "#1a140c", 0.85] },
          { directionalLight: null, position: [4, 6, -1], intensity: 1.6, color: "#fff1c2" },
          { directionalLight: null, position: [-5, 3, 3], intensity: 0.7, color: "#8ecbff" },

          // Ground disc the duck sits on.
          {
            mesh: [
              { circleGeometry: null, args: [3.4, 48] },
              { meshStandardMaterial: null, color: "#12141c", roughness: 0.9 },
            ],
            "rotation-x": -Math.PI / 2,
            position: [0, -1.02, 0],
          },

          // Soft contact shadow, just above the ground disc so it doesn't
          // z-fight — grounds the duck with a depth cue instead of letting
          // it float in the vignette.
          {
            mesh: [
              { circleGeometry: null, args: [1.5, 32] },
              { meshBasicMaterial: null, map: contactShadowTexture, transparent: true, depthWrite: false },
            ],
            "rotation-x": -Math.PI / 2,
            position: [0, -1.01, 0],
          },

          // This slot renders a spinning wireframe placeholder until
          // `duck.data` resolves, then swaps to the loaded model — a
          // different tag (`mesh` vs `primitive`) at the same array
          // position means the reconciler disposes the placeholder and
          // mounts the model fresh, rather than diffing props in place.
          gltf
            ? { primitive: null, object: gltf.scene, onUpdate: fitDuck }
            : {
                mesh: [
                  { icosahedronGeometry: null, args: [0.9, 0] },
                  { meshStandardMaterial: null, color: "#8892b0", wireframe: true },
                ],
                onFrame: (root, delta, self) => {
                  self.rotation.x += delta * 0.6;
                  self.rotation.y += delta * 0.9;
                },
              },

          {
            // args resolves lazily against the live root (camera + canvas
            // aren't known until the scene mounts), so it's a function here
            // rather than a plain array.
            orbitControls: null,
            args: (l, root) => [root.camera, root.canvas],
            enableDamping: true,
            dampingFactor: 0.08,
            minDistance: 2,
            maxDistance: 10,
            target: [0, 0.3, 0],
            // Idle drift toward the duck's face, clamped to +-40deg around
            // CAMERA_START's own azimuth — wide enough to feel alive, never
            // wide enough to swing back around to the shapeless rear view.
            // OrbitControls has no ping-pong: once autoRotate carries the
            // angle to a clamp boundary it just holds there, which is fine
            // here since both boundaries are still front-of-model views.
            autoRotate: true,
            autoRotateSpeed: 0.6,
            minAzimuthAngle: FRONT_AZIMUTH - AZIMUTH_SWING,
            maxAzimuthAngle: FRONT_AZIMUTH + AZIMUTH_SWING,
            onFrame: (root, delta, self) => {
              self.update();
            },
          },
        ];
      },
    }),
  ],
};

export default App;
