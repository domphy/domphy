import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { three } from "@domphy/three";
import * as THREE from "three";

// Replaces the default renderer wholesale. The defaults already cover the
// ordinary knobs (`powerPreference: "high-performance"`, `antialias: true`,
// `alpha: true`, and anything passed through the `gl` option), so reach for
// this hook when you need a DIFFERENT renderer object: a WebGPURenderer, a
// post-processing composer, or a stub in tests. Spelled out here so you can
// see exactly what the contract is.
function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "420px",
    borderRadius: themeSpacing(3),
    overflow: "hidden",
  },
  $: [
    three({
      createRenderer,
      camera: { position: [0, 0, 4] },
      scene: [
        {
          mesh: [
            { torusGeometry: null, args: [0.9, 0.3, 16, 48] },
            { meshStandardMaterial: null, color: "orange" },
          ],
          onFrame: (_root, delta, self) => {
            self.rotation.x += delta;
            self.rotation.y += delta * 0.6;
          },
        },
        { ambientLight: null, intensity: 0.6 },
        { directionalLight: null, position: [5, 5, 5] },
      ],
    }),
  ],
};

export default App;
