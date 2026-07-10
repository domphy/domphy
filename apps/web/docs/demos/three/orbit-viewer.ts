import type { DomphyElement } from "@domphy/core";
import { extend, three } from "@domphy/three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// OrbitControls lives outside the `three` core namespace, so it enters
// user-land through extend() — the package itself never imports it.
extend({ OrbitControls });

// autoRotate stays on for a couple seconds after mount so there is visible
// motion to see (and screenshot) immediately, then it switches itself off —
// after that the scene genuinely idles, same as before: "demand" mode only
// renders while the camera is moving or still settling from user drag.
let autoRotateElapsed = 0;

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
      // Demand mode: the scene only renders while OrbitControls' damping
      // is still settling a drag — an idle, unorbited scene costs nothing.
      frameloop: "demand",
      // Off-center 3/4 framing, tilted down ~15° — less dead-center than
      // looking straight at the knot from eye level.
      camera: { position: [5.6, 2, 3.9], fov: 45 },
      scene: [
        // Studio backdrop: dark background + fog give the subject a
        // radial, enveloping falloff instead of a flat void.
        { color: null, attach: "background", args: ["#05060a"] },
        { fog: null, args: ["#05060a", 4, 14] },

        // Three-point lighting rig, colored for a studio-photography feel.
        // Dim ambient fill so unlit facets don't crush to pure black.
        { ambientLight: null, intensity: 0.35, color: "#151822" },
        // Key: warm white, front-top.
        {
          directionalLight: null,
          position: [4, 6, 5],
          intensity: 2.4,
          color: "#fff4e0",
        },
        // Fill: cool cyan rim from the opposite side.
        {
          directionalLight: null,
          position: [-6, 2, -3],
          intensity: 0.9,
          color: "#4fd8ff",
        },
        // Back/rim: magenta accent light behind the subject.
        {
          pointLight: null,
          position: [-3, 4, -6],
          intensity: 45,
          color: "#ff3d94",
        },

        // Ground disc so the knot doesn't float in a void — fog does the
        // radial-falloff work, dissolving its edge into the backdrop.
        {
          mesh: [
            { circleGeometry: null, args: [7, 64] },
            {
              meshStandardMaterial: null,
              color: "#0d1018",
              roughness: 0.35,
              metalness: 0.6,
              transparent: true,
              opacity: 0.9,
            },
          ],
          "rotation-x": -Math.PI / 2,
          position: [0, -1.5, 0],
        },

        {
          mesh: [
            { torusKnotGeometry: null, args: [1.1, 0.38, 220, 32] },
            {
              meshStandardMaterial: null,
              color: "#d7dee8",
              metalness: 1,
              roughness: 0.15,
            },
          ],
        },

        {
          // args resolves lazily against the live root (camera + canvas
          // aren't known until the scene mounts), so it's a function here
          // rather than a plain array.
          orbitControls: null,
          args: (_l, root) => [root.camera, root.canvas],
          enableDamping: true,
          dampingFactor: 0.08,
          autoRotate: true,
          autoRotateSpeed: 1.5,
          // OrbitControls has no `onChange` property, so this binds
          // addEventListener("change", ...) — fired on every camera move,
          // including the damped tail after a drag ends. That's what
          // keeps "demand" mode rendering until the motion settles.
          onChange: (_event, root, _self) => {
            root.invalidate();
          },
          // onFrame is the useFrame() analog: runs every rendered frame
          // as (root, delta, self) — self is this node's THREE instance.
          // self.update() is also what advances autoRotate's spin, and
          // its "change" event is what feeds the invalidate() loop above.
          onFrame: (_root, delta, self) => {
            self.update();
            if (self.autoRotate) {
              autoRotateElapsed += delta;
              if (autoRotateElapsed > 2.5) self.autoRotate = false;
            }
          },
        },
      ],
    }),
  ],
};

export default App;
