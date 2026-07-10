import type { DomphyElement } from "@domphy/core";
import { RecordState } from "@domphy/core";
import { three } from "@domphy/three";
import { Color } from "three";

// Per-cell state lives in one RecordState, keyed by "row-col" — each cell's
// material/motion reads only its own key (cells.get(key, l)), so hovering
// one box notifies only that key's subscribers, never the other 24.
interface CellState {
  hover: boolean;
  pulseId: number; // bumped on every click; onFrame diffs it to retrigger the pulse
}

type CellRecord = Record<string, CellState>;

const GRID_SIZE = 5;
const SPACING = 1.1;
const BASE_COLOR = "#5a6b8c"; // lighter slate-blue so unlit faces still read against the void
const ACCENT_COLOR = "#66aaff"; // bright hover tint, doubles as the hover emissive glow
const RIM_COLOR = "#22d3ee"; // rim/accent light — cool counterpoint to the accent hover tint

const HOVER_LIFT = 0.35; // z-pop toward the camera on hover
const LIFT_SMOOTHING = 9; // per-second lerp rate toward the hover target
const IDLE_SPEED = 1.2;
const IDLE_AMPLITUDE = 0.42; // per-cell breathing along z — large enough that the phase spread across cells reads in a single still frame, not just on hover/click
const PULSE_DAMPING = 6;
const PULSE_FREQUENCY = 16;
const PULSE_AMPLITUDE = 0.22;

const initialCells: CellRecord = {};
for (let row = 0; row < GRID_SIZE; row++) {
  for (let column = 0; column < GRID_SIZE; column++) {
    initialCells[`${row}-${column}`] = { hover: false, pulseId: 0 };
  }
}
const cells = new RecordState<CellRecord>(initialCells);

const gridCells: Record<string, any>[] = [];
for (let row = 0; row < GRID_SIZE; row++) {
  for (let column = 0; column < GRID_SIZE; column++) {
    const key = `${row}-${column}`;
    const x = (column - (GRID_SIZE - 1) / 2) * SPACING;
    const y = ((GRID_SIZE - 1) / 2 - row) * SPACING;
    const idlePhase = row * 0.6 + column * 0.4;

    // Local to this cell's closure — cross-generation animation state that
    // has no business living in reactive State (nothing else ever reads
    // it), kept here exactly because this scene array is built once and
    // each onFrame below is bound to one fixed SceneNode for the app's life.
    let currentLift = 0;
    let lastSeenPulseId = 0;
    let pulseElapsed = 1000; // large finite -> exp(-huge) underflows to 0, no NaN

    gridCells.push({
      mesh: [
        { boxGeometry: null, args: [0.85, 0.85, 0.55] },
        {
          meshStandardMaterial: null,
          // Reactive prop (function-prop rule 7): re-applies and calls
          // root.invalidate() only when THIS cell's hover flag flips.
          color: (l) => (cells.get(key, l).hover ? ACCENT_COLOR : BASE_COLOR),
          // Small emissive kick on hover so the hovered cube visibly glows
          // instead of just reading as a flat color swap.
          emissive: (l) => (cells.get(key, l).hover ? ACCENT_COLOR : "#000000"),
          emissiveIntensity: 0.45,
          roughness: 0.35,
          metalness: 0.15,
        },
      ],
      _key: key,
      position: [x, y, 0],
      castShadow: true,
      receiveShadow: true,
      onPointerOver: () => {
        cells.set(key, { ...cells.get(key), hover: true });
      },
      onPointerOut: () => {
        cells.set(key, { ...cells.get(key), hover: false });
      },
      onClick: () => {
        const state = cells.get(key);
        cells.set(key, { ...state, pulseId: state.pulseId + 1 });
      },
      // onFrame drives the continuous spring/idle motion; cells.get(key)
      // here is an untracked read (no listener passed) — onFrame already
      // runs every frame, so there is nothing to subscribe to.
      onFrame: (root, delta, self) => {
        const state = cells.get(key);
        if (state.pulseId !== lastSeenPulseId) {
          lastSeenPulseId = state.pulseId;
          pulseElapsed = 0;
        } else {
          pulseElapsed += delta;
        }

        const targetLift = state.hover ? HOVER_LIFT : 0;
        currentLift +=
          (targetLift - currentLift) * Math.min(1, delta * LIFT_SMOOTHING);

        const idleBob =
          Math.sin(root.clock.getElapsedTime() * IDLE_SPEED + idlePhase) *
          IDLE_AMPLITUDE;
        const pulseBump =
          Math.exp(-pulseElapsed * PULSE_DAMPING) *
          Math.cos(pulseElapsed * PULSE_FREQUENCY) *
          PULSE_AMPLITUDE;

        self.position.z = idleBob + currentLift;
        self.scale.setScalar(1 + pulseBump);
      },
    });
  }
}

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: "460px",
    borderRadius: "12px",
    overflow: "hidden",
  },
  $: [
    three({
      // Elevated 3/4 angle (~34° above the grid plane, offset in x) rather
      // than a flat head-on shot — lets the top face of every box catch the
      // key light and read as a distinct plane from its front/side faces.
      // Pulled in close (same direction, smaller magnitude than a wide
      // establishing shot) so the 5x5 wall fills most of the frame width.
      camera: { position: [1.9, 2.9, 3.8] },
      // "soft" enables PCFSoftShadowMap on the renderer — required for the
      // key light's castShadow below to actually paint the backdrop plane.
      shadows: "soft",
      // Fixed cinematic backdrop — scene content rendered inside the canvas,
      // not a DOM element, so doctor's raw-theme-value rule doesn't apply.
      onCreated: (root) => {
        root.camera.lookAt(0, 0, 0);
        root.scene.background = new Color("#0b0d14");
      },
      // Explicit (matches the "always" default): every cell's onFrame runs
      // a free-running idle bob independent of any State change, so demand
      // mode — which only re-renders after invalidate() — would leave the
      // wall static between hovers/clicks.
      frameloop: "always",
      scene: [
        ...gridCells,
        // Dark backdrop plane behind the wall — close enough in value to the
        // scene background that it reads as "void", but present so the key
        // light's shadow has something to land on: a soft contact shadow
        // under/behind each box instead of flat, shadowless cubes.
        {
          mesh: [
            // Sized well past the closer camera's frustum at this depth so
            // its edges never enter frame — only the shadow it catches should
            // ever be visible, never a hard silhouette against the void.
            { planeGeometry: null, args: [40, 40] },
            { meshStandardMaterial: null, color: "#0d0f16", roughness: 1 },
          ],
          position: [0, 0, -0.9],
          receiveShadow: true,
        },
        // Ambient fill raised to physical units — the wall reads clearly
        // against the near-black void without flattening the 3-point setup
        // below (key still dominates via its much higher intensity).
        { ambientLight: null, intensity: 0.65 },
        // Key: warm, top-front, casts the shadow that lands on the backdrop.
        {
          directionalLight: null,
          position: [4, 6, 5],
          intensity: 2.2,
          color: "#fff2df",
          castShadow: true,
          "shadow-mapSize-width": 1024,
          "shadow-mapSize-height": 1024,
          "shadow-camera-left": -4,
          "shadow-camera-right": 4,
          "shadow-camera-top": 4,
          "shadow-camera-bottom": -4,
          "shadow-camera-near": 1,
          "shadow-camera-far": 12,
          "shadow-bias": -0.0015,
          // The shadow camera's frustum props above only take effect once
          // its projection matrix is recomputed — three.js doesn't do this
          // automatically on assignment (see OrthographicCamera docs).
          onUpdate: (self) => self.shadow.camera.updateProjectionMatrix(),
        },
        // Fill: cool, opposite side, low intensity — softens the key's
        // shadow on the boxes' far side without erasing it.
        {
          directionalLight: null,
          position: [-5, 1.5, 3],
          intensity: 0.4,
          color: "#8fb8ff",
        },
        // Rim: accent-hued point light from below/behind, separates each
        // box's silhouette from the near-black backdrop.
        {
          pointLight: null,
          position: [-2, -3, 3],
          intensity: 10,
          color: RIM_COLOR,
        },
      ],
    }),
  ],
};

export default App;
