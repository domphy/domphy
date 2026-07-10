import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import * as THREE from "three";

// Injected in place of the default `new THREE.WebGLRenderer({ canvas,
// antialias: true, ...gl })` — `alpha: true` + a transparent clear color let
// the page's own background show through the canvas.
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
    borderRadius: "12px",
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
          onFrame: (root, delta, self) => {
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
