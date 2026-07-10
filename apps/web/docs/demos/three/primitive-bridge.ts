import type { DomphyElement } from "@domphy/core";
import { three } from "@domphy/three";
import * as THREE from "three";

// A procedural night-city skyline. Per-building footprint size, height, body
// color and "lit window" emissive tint are all one-off constructor decisions
// made once at build time — nothing here changes per frame or reacts to
// State, so there is no declarative win in expressing 56 individual
// `{ mesh: [...] }` scene nodes. Building it as plain three.js code and
// handing the finished THREE.Group to `primitive` is the shorter, clearer
// path: this is the escape hatch, not a workaround.
const GRID_SIZE = 8;
const SPACING = 2.4;
const ORIGIN = (GRID_SIZE - 1) / 2;
// One column is left empty — a street canyon for the camera to look down,
// instead of buildings packed edge-to-edge under a top-down camera.
const STREET_COLUMN = 4;

const BODY_COLOR_A = new THREE.Color("#2a2f3d");
const BODY_COLOR_B = new THREE.Color("#3d4356");
const WINDOW_COLOR = new THREE.Color("#ffcf6b"); // warm amber, believable lit windows

const city = new THREE.Group();
for (let row = 0; row < GRID_SIZE; row++) {
  for (let column = 0; column < GRID_SIZE; column++) {
    if (column === STREET_COLUMN) continue; // leave the street corridor clear

    // ponytail: a BoxGeometry footprint stands in for an extruded building
    // shape — an axis-aligned rectangular tower looks identical either way,
    // so ExtrudeGeometry would only add build cost, not visual result.
    const width = 0.8 + Math.random() * 1.0;
    const depth = 0.8 + Math.random() * 1.0;
    const height = 1 + Math.random() * 8;

    // Desaturated cool-gray body — city concrete/glass under moonlight.
    const bodyColor = new THREE.Color().lerpColors(
      BODY_COLOR_A,
      BODY_COLOR_B,
      Math.random(),
    );

    // Roughly two-thirds of buildings have their windows lit; the rest sit
    // near-black with only a faint emissive floor. Per-box intensity
    // variance is what reads as "windows", not any actual window geometry.
    const lit = Math.random() < 0.65;
    // Kept low so the amber glow reads as windows in a cool-gray tower, not
    // an all-amber city — the body color must survive the emissive layer.
    const emissiveIntensity = lit
      ? 0.18 + Math.random() * 0.35
      : 0.03 + Math.random() * 0.05;

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color: bodyColor,
        emissive: WINDOW_COLOR,
        emissiveIntensity,
        roughness: 0.65,
        metalness: 0.15,
      }),
    );

    const jitterX = (Math.random() - 0.5) * 0.4;
    const jitterZ = (Math.random() - 0.5) * 0.4;
    building.position.set(
      (column - ORIGIN) * SPACING + jitterX,
      height / 2,
      (row - ORIGIN) * SPACING + jitterZ,
    );
    city.add(building);
  }
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
      // Elevated three-quarter overview: high enough that the whole skyline
      // and the glowing street canyon stay in frame while the turntable
      // spins, low enough that towers still read with real height.
      camera: { position: [-11, 13, -14], fov: 50 },
      onCreated: (root) => {
        root.camera.lookAt(0, 1, 0);
      },
      scene: [
        // Night sky + fog, same attach mechanism (inferred from `.isFog`)
        // that a mesh child uses for its geometry/material — near/far tuned
        // so the street canyon stays crisp and the back rows dissolve into
        // the backdrop instead of hitting a hard fog wall.
        { color: null, attach: "background", args: ["#05070d"] },
        { fog: null, args: ["#05070d", 10, 35] },

        // Ground plane the city sits on — without it the towers' bases just
        // vanish into the backdrop instead of reading as a street level.
        {
          mesh: [
            { planeGeometry: null, args: [60, 60] },
            { meshStandardMaterial: null, color: "#0a0d14", roughness: 1 },
          ],
          rotation: [-Math.PI / 2, 0, 0],
          position: [0, -0.01, 0],
        },

        {
          // The imperative escape hatch: `object` adopts `city` as-is.
          // `dispose: null` is written explicitly here (it's also implied
          // for any `primitive`) — its meshes/materials are owned by this
          // module, not by the reconciler, so removing this node from the
          // scene must never call .dispose() on them.
          primitive: [],
          object: city,
          dispose: null,
          // A slow turntable sells the skyline as a scene, not a screenshot.
          // onFrame runs every rendered frame as (root, delta, self) — self
          // is `city` itself here.
          onFrame: (_root, delta, self) => {
            self.rotation.y += delta * 0.05;
          },
        },

        // Ambient city-glow tint, standing in for light bounced off haze
        // and every unseen lit window at once.
        { ambientLight: null, intensity: 0.3, color: "#1a1030" },
        // Moonlight rim: low and grazing, cool against the warm windows.
        {
          directionalLight: null,
          position: [-14, 6, 10],
          intensity: 1.8,
          color: "#8fb8ff",
        },
        // Warm streetlight glow, low in the street canyon (same x as
        // STREET_COLUMN) — physically-correct lighting means intensity here
        // is candela-scale, not the old 0-1 range.
        {
          pointLight: null,
          position: [(STREET_COLUMN - ORIGIN) * SPACING, 1.2, 0],
          intensity: 80,
          color: "#ffb066",
        },
      ],
    }),
  ],
};

export default App;
