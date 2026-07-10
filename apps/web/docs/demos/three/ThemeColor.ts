import type { DomphyElement } from "@domphy/core";
import { themeColorToken } from "@domphy/theme";
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
      camera: { position: [0, 0, 4] },
      scene: [
        {
          mesh: [
            { icosahedronGeometry: null, args: [1, 1] },
            {
              meshStandardMaterial: null,
              // Same idiom @domphy/chart uses for its own canvas colors —
              // resolves the theme's "primary" family at tone shift-9.
              color: themeColorToken(null, "shift-9", "primary"),
            },
          ],
          onFrame: (root, delta, self) => {
            self.rotation.y += delta;
          },
        },
        { ambientLight: null, intensity: 0.7 },
        { directionalLight: null, position: [5, 5, 5] },
      ],
    }),
  ],
};

export default App;
