import type { DomphyElement } from "@domphy/core";
import { extend, three } from "@domphy/three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// OrbitControls lives outside the `three` core namespace, so it enters
// user-land through extend() — the package itself never imports it.
extend({ OrbitControls });

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
      camera: { position: [3, 3, 3] },
      scene: [
        {
          mesh: [
            { boxGeometry: null },
            { meshStandardMaterial: null, color: "orange" },
          ],
        },
        { ambientLight: null, intensity: 0.5 },
        { directionalLight: null, position: [5, 5, 5] },
        {
          // args resolves lazily against the live root (camera + canvas
          // aren't known until the scene mounts), so it's a function here
          // rather than a plain array.
          orbitControls: null,
          args: (_l, root) => [root.camera, root.gl.domElement],
          enableDamping: true,
          // onFrame is the useFrame() analog: called every rendered frame
          // with (root, delta, self) — self is this node's THREE instance.
          onFrame: (_root, _delta, self) => {
            self.update();
          },
        },
      ],
    }),
  ],
};

export default App;
