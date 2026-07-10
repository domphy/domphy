import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import * as THREE from "three";

// Per-instance transforms at 400-instance granularity aren't expressible
// through the declarative `args`/props grammar, so the field is built as one
// imperative InstancedMesh and adopted via `primitive` (same pattern as the
// InstancedPrimitive recipe) — onFrame then rewrites every instance's matrix
// each tick. Color is a static per-instance HSL ramp set once at init (grid
// position, not wave height), so onFrame only ever touches the matrix and
// the material can stay a normally-lit MeshStandardMaterial.
const GRID_SIZE = 20; // 20 x 20 = 400 boxes
const SPACING = 1.1;
const AMPLITUDE = 2.4;
const WAVE_LENGTH = 5; // grid cells per full sine cycle
const WAVE_SPEED = 1.6;

// HSL ramp across the grid, corner to corner: blue at one edge, magenta at
// the other, constant lightness — the field reads as a color gradient
// independent of the wave motion riding on top of it.
const HUE_START = 220 / 360;
const HUE_END = 320 / 360;
const SATURATION = 0.7;
const LIGHTNESS = 0.55;

const field = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.7, 0.7, 0.7),
  new THREE.MeshStandardMaterial({ roughness: 0.4 }),
  GRID_SIZE * GRID_SIZE,
);

// World-space x/z per instance, precomputed once — onFrame only ever
// touches y, so the per-frame loop is one sin/cos/matrix-write per instance.
const columnPositions = new Float32Array(GRID_SIZE * GRID_SIZE);
const rowPositions = new Float32Array(GRID_SIZE * GRID_SIZE);
const origin = (GRID_SIZE - 1) / 2;
const dummy = new THREE.Object3D();
const tint = new THREE.Color();

let index = 0;
for (let row = 0; row < GRID_SIZE; row++) {
  for (let column = 0; column < GRID_SIZE; column++) {
    const x = (column - origin) * SPACING;
    const z = (row - origin) * SPACING;
    columnPositions[index] = x;
    rowPositions[index] = z;

    dummy.position.set(x, 0, z);
    dummy.updateMatrix();
    field.setMatrixAt(index, dummy.matrix);

    const diagonalFraction = (row + column) / (2 * (GRID_SIZE - 1));
    tint.setHSL(
      THREE.MathUtils.lerp(HUE_START, HUE_END, diagonalFraction),
      SATURATION,
      LIGHTNESS,
    );
    field.setColorAt(index, tint);

    index++;
  }
}
field.instanceMatrix.needsUpdate = true;
if (field.instanceColor) field.instanceColor.needsUpdate = true;

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "460px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      // Elevated, close-in view looking straight at the field center — keeps
      // the whole 20x20 wave inside frame (the old raking, far-back camera
      // pushed most rows past the fog's far distance, reading as black).
      camera: { position: [0, 7, 13] },
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        // Fixed cinematic backdrop — this is scene content rendered inside
        // the canvas, not a DOM element, so doctor's raw-theme-value rule
        // (which governs DOM style props) doesn't apply here. Matches the
        // fog color below so the far field dissolves into the backdrop
        // rather than into a visibly different rectangle.
        root.scene.background = new THREE.Color("#05060a");
      },
      // Continuous per-tick motion, not driven by any State change — needs
      // "always" (the default, made explicit here): under "demand" nothing
      // would ever call invalidate() and the wave freezes on frame one. Save
      // "demand" for scenes driven purely by reactive props (sliders,
      // toggles) with no free-running onFrame animation.
      frameloop: "always",
      scene: [
        {
          primitive: null,
          object: field,
          onFrame: (_root, delta, self) => {
            self.userData.time = (self.userData.time ?? 0) + delta * WAVE_SPEED;
            const time = self.userData.time;
            for (let point = 0; point < columnPositions.length; point++) {
              const x = columnPositions[point];
              const z = rowPositions[point];
              const y =
                Math.sin(x / WAVE_LENGTH + time) *
                Math.cos(z / WAVE_LENGTH + time * 0.6) *
                AMPLITUDE;
              dummy.position.set(x, y, z);
              dummy.updateMatrix();
              self.setMatrixAt(point, dummy.matrix);
            }
            self.instanceMatrix.needsUpdate = true;
          },
        },
        // .isFog inferred -> attach "fog", same inference rule that resolves
        // a mesh child's geometry/material — here the parent is the scene
        // itself, so this sets root.scene.fog. Color matches the backdrop
        // above; near/far tuned to the [0, 7, 13] camera so the front rows
        // stay crisp and the back corners fade into the backdrop.
        { fog: null, args: ["#05060a", 8, 34] },
        { ambientLight: null, intensity: 0.6 },
        { directionalLight: null, position: [5, 10, 7], intensity: 2.5 },
        // Low glow hovering just over the field, catching the wave crests.
        {
          pointLight: null,
          position: [0, 3, 2],
          color: "#7c6cf4",
          intensity: 60,
          distance: 0,
        },
      ],
    }),
  ],
};

export default App;
