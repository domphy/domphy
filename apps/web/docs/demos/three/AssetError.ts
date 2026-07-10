import type { DomphyElement } from "@domphy/core";
import { loadAsset, three } from "@domphy/three";
import { errorBoundary } from "@domphy/ui";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Deliberately missing — this AssetResult's `error` state settles instead of
// `data`.
const result = loadAsset(GLTFLoader, "/models/does-not-exist.glb");

const App: DomphyElement<"div"> = {
  // `three()`'s own `scene` reactivity can't reach `errorBoundary()` — it
  // only catches errors thrown inside a core reactive-children function like
  // this one. Check `result.error` here, before ever handing control to
  // `three()`.
  div: (l) => {
    const error = result.error.get(l);
    if (error) throw error;
    return [
      {
        div: null,
        style: { width: "100%", height: "100%" },
        $: [
          three({
            scene: (sceneListener) => {
              const gltf = result.data.get(sceneListener);
              return gltf ? [{ primitive: null, object: gltf.scene }] : null;
            },
          }),
        ],
      },
    ];
  },
  style: {
    width: "100%",
    height: "420px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    errorBoundary({
      fallback: (error) => ({ p: `Failed to load model: ${String(error)}` }),
    }),
  ],
};

export default App;
