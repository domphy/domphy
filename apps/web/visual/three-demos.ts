/**
 * Demos for the @domphy/three Playwright spec (three.spec.ts), solo-mounted
 * via the standalone catalog's `?catalog=three&only=<name>` mode.
 *
 * - `spinningCube`: the docs demo as-is (real WebGLRenderer, frameloop
 *   "always") — mount/render/resize checks.
 * - `toggle`: a button that mounts/unmounts a three() host reactively —
 *   unmount disposal (forceContextLoss, listener teardown) and remount must
 *   not throw or leak console errors.
 */
import { type DomphyElement, toState } from "@domphy/core";
import { three } from "@domphy/three";
import { Color } from "three";
import spinningCube from "../docs/demos/three/spinning-cube.js";

function cubeScene() {
  return three({
    camera: { position: [0, 1.2, 4.5] },
    onCreated: (root) => {
      root.scene.background = new Color("#0b0e1a");
      root.camera.lookAt(0, 0, 0);
    },
    scene: [
      {
        mesh: [
          { boxGeometry: null, args: [1.4, 1.4, 1.4] },
          { meshStandardMaterial: null, color: "#e8955a", roughness: 0.35 },
        ],
        onFrame: (_root, delta, self) => {
          self.rotation.y += delta * 0.6;
        },
      },
      { ambientLight: null, intensity: 0.7 },
      { directionalLight: null, position: [3, 4, 5], intensity: 2.5 },
    ],
  });
}

const mounted = toState(true);

const toggle: DomphyElement<"div"> = {
  div: [
    {
      button: (l) => (mounted.get(l) ? "Unmount scene" : "Mount scene"),
      "data-three-toggle": "1",
      onClick: () => mounted.set(!mounted.get()),
    },
    {
      div: (l) =>
        mounted.get(l)
          ? [
              {
                div: null,
                style: { width: "100%", height: "300px" },
                $: [cubeScene()],
              },
            ]
          : [],
    },
  ],
};

export const threeDemos: Record<string, () => DomphyElement> = {
  spinningCube: () => spinningCube,
  toggle: () => toggle,
};
