import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";

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
            { meshStandardMaterial: { color: "orange" } },
          ],
          // onFrame is the useFrame() analog: called every rendered frame
          // with (root, delta, self) — self is this node's THREE instance.
          onFrame: (_root, delta, self) => {
            self.rotation.y += delta;
            self.rotation.x += delta * 0.4;
          },
        },
        { ambientLight: null, intensity: 0.5 },
        { directionalLight: null, position: [5, 5, 5] },
      ],
    }),
  ],
};

export default App;
