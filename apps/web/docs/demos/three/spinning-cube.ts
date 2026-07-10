import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import { Color } from "three";

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
      camera: { position: [0, 1.2, 4.5] },
      onCreated: (root) => {
        root.scene.background = new Color("#0b0e1a");
        // A PerspectiveCamera never rotates itself — without lookAt it stares
        // down its local -Z axis and misses the cube.
        root.camera.lookAt(0, 0, 0);
      },
      scene: [
        {
          mesh: [
            { boxGeometry: null, args: [1.4, 1.4, 1.4] },
            { meshStandardMaterial: null, color: "#e8955a", roughness: 0.35 },
          ],
          onFrame: (root, delta, self) => {
            self.rotation.y += delta * 0.6;
            self.rotation.x = Math.sin(root.clock.getElapsedTime() * 0.8) * 0.3;
            self.position.y =
              Math.sin(root.clock.getElapsedTime() * 1.5) * 0.25;
          },
        },
        { ambientLight: null, intensity: 0.7 },
        { directionalLight: null, position: [3, 4, 5], intensity: 2.5 },
        {
          pointLight: null,
          position: [-3, 2, -4],
          intensity: 50,
          color: "#7c6cf4",
        },
      ],
    }),
  ],
};

export default App;
