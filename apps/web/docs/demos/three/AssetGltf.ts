import type { DomphyElement } from "@domphy/core";
import { loadAsset, three } from "@domphy/three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

interface DuckGLTF {
  scene: any;
}

// Cache key is GLTFLoader + this url — call loadAsset() again anywhere with
// the same pair and you get back this exact AssetResult.
const duck = loadAsset<DuckGLTF>(GLTFLoader, "/models/Duck.glb");

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
      scene: (l) => {
        const gltf = duck.data.get(l);
        return [
          { ambientLight: null, intensity: 0.7 },
          { directionalLight: null, position: [5, 5, 5] },
          // Falsy children are skipped, so before `data` resolves this slot
          // renders a placeholder cube instead of the loaded model.
          gltf
            ? { primitive: null, object: gltf.scene }
            : {
                mesh: [
                  { boxGeometry: null, args: [0.6, 0.6, 0.6] },
                  { meshStandardMaterial: null, color: "gray" },
                ],
              },
        ];
      },
    }),
  ],
};

export default App;
