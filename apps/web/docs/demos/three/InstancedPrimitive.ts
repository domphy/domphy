import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import * as THREE from "three";

// An imperative core built with three.js's own API, outside the declarative
// scene grammar (per-instance transforms via setMatrixAt aren't expressible
// through `args`/props at all) — `primitive` adopts it as-is.
const COUNT = 200;
const spheres = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.15, 12, 12),
  new THREE.MeshStandardMaterial({ color: "orange" }),
  COUNT,
);
const dummy = new THREE.Object3D();
for (let index = 0; index < COUNT; index++) {
  dummy.position.set(
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 6,
  );
  dummy.updateMatrix();
  spheres.setMatrixAt(index, dummy.matrix);
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
      camera: { position: [0, 0, 8] },
      scene: [
        // Never disposed by @domphy/three (implicit `dispose: null` for a
        // primitive) — the instance keeps its own lifecycle.
        {
          primitive: null,
          object: spheres,
          onFrame: (_root, delta, self) => {
            self.rotation.y += delta * 0.3;
          },
        },
        { ambientLight: null, intensity: 0.7 },
        { directionalLight: null, position: [5, 5, 5] },
      ],
    }),
  ],
};

export default App;
