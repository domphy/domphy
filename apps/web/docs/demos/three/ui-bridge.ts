import type { DomphyElement } from "@domphy/core";
import { RecordState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import {
  card,
  formGroup,
  heading,
  inputNumber,
  inputSwitch,
  label,
  select,
  small,
} from "@domphy/ui";
import { three } from "@domphy/three";
import { Color } from "three";

// One reactive graph: this RecordState drives both the DOM controls on the
// left and the three.js torus on the right. Neither side knows about the
// other's technology — they only know about the listener.
const controls = new RecordState({
  radius: 0.9,
  tube: 0.3,
  colorHex: "#e8b4ff",
  wireframe: false,
});

const colorOptions = [
  { label: "Magenta", hex: "#e8b4ff" },
  { label: "Amber", hex: "#fbbf24" },
  { label: "Cyan", hex: "#22d3ee" },
  { label: "Emerald", hex: "#34d399" },
  { label: "Rose", hex: "#fb7185" },
];

const panel: DomphyElement<"div"> = {
  div: [
    { h3: "Torus Controls", $: [heading()] },
    {
      div: [
        {
          fieldset: [
            { legend: "Geometry & material" },
            { label: "Radius", htmlFor: "ui-bridge-radius", $: [label()] },
            {
              input: null,
              id: "ui-bridge-radius",
              type: "number",
              min: "0.3",
              max: "1.6",
              step: "0.05",
              value: (l) => String(controls.get("radius", l)),
              onInput: (e) => {
                const value = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(value)) controls.set("radius", value);
              },
              $: [inputNumber()],
            } as DomphyElement<"input">,
            { label: "Tube", htmlFor: "ui-bridge-tube", $: [label()] },
            {
              input: null,
              id: "ui-bridge-tube",
              type: "number",
              min: "0.05",
              max: "0.6",
              step: "0.01",
              value: (l) => String(controls.get("tube", l)),
              onInput: (e) => {
                const value = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(value)) controls.set("tube", value);
              },
              $: [inputNumber()],
            } as DomphyElement<"input">,
            { label: "Color", htmlFor: "ui-bridge-color", $: [label()] },
            {
              select: colorOptions.map((option) => ({
                option: option.label,
                value: option.hex,
              })),
              id: "ui-bridge-color",
              value: (l) => controls.get("colorHex", l),
              onInput: (e) => {
                controls.set("colorHex", (e.target as HTMLSelectElement).value);
              },
              $: [select()],
            } as DomphyElement<"select">,
            {
              label: "Wireframe",
              htmlFor: "ui-bridge-wireframe",
              $: [label()],
            },
            {
              input: null,
              id: "ui-bridge-wireframe",
              type: "checkbox",
              checked: (l) => controls.get("wireframe", l),
              onInput: (e) => {
                controls.set("wireframe", (e.target as HTMLInputElement).checked);
              },
              // Decorative track/knob, no text content of its own — the
              // sibling <label> carries the color-bearing text.
              _doctorDisable: "missing-color",
              $: [inputSwitch()],
            } as DomphyElement<"input">,
          ],
          $: [formGroup({ layout: "vertical" })],
        } as DomphyElement<"fieldset">,
      ],
    },
    {
      footer: [
        {
          small:
            "Radius/tube resize the geometry (args reconstruction); color/wireframe patch the live material.",
          $: [small()],
        },
      ],
    },
  ],
  $: [card()],
  style: { width: "280px", flexShrink: 0 },
};

const viewport: DomphyElement<"div"> = {
  div: null,
  style: {
    flex: "1",
    minWidth: "480px",
    minHeight: "420px",
    borderRadius: themeSpacing(3),
    overflow: "hidden",
  },
  $: [
    three({
      camera: { position: [0, 1.4, 4.2] },
      // Fixed cinematic backdrop inside the canvas — doctor's theme-color
      // rules govern the DOM around the canvas, not the rendered scene.
      onCreated: (root) => {
        root.scene.background = new Color("#0f172a");
        root.camera.lookAt(0, 0, 0);
      },
      scene: [
        {
          mesh: [
            {
              torusGeometry: null,
              // A function `args` — reads the RecordState reactively, so
              // dragging radius/tube reconstructs a brand new
              // THREE.TorusGeometry instance (see grammar: args reconstruction).
              args: (l) => [
                controls.get("radius", l),
                controls.get("tube", l),
                32,
                96,
              ],
            },
            {
              meshStandardMaterial: null,
              // Reactive value props (rule 7): re-applied in place on the
              // existing material, no reconstruction needed.
              color: (l) => controls.get("colorHex", l),
              wireframe: (l) => controls.get("wireframe", l),
              roughness: 0.35,
              metalness: 0.15,
            },
          ],
          onFrame: (root, delta, self) => {
            self.rotation.y += delta * 0.15;
            self.rotation.x = Math.sin(root.clock.getElapsedTime() * 0.35) * 0.12;
          },
        },
        // Floor: keeps the torus (and its wireframe state, where the mesh
        // itself has no filled faces to catch light) legible against the
        // dark backdrop instead of floating in undifferentiated black.
        {
          mesh: [
            { planeGeometry: null, args: [8, 8] },
            { meshStandardMaterial: null, color: "#1c2333", roughness: 0.95 },
          ],
          // Below the largest possible torus extent (radius 1.6 + tube 0.6 =
          // 2.2) so it never clips through as the sliders are dragged.
          position: [0, -2.3, 0],
          "rotation-x": -Math.PI / 2,
        },
        // Three.js is physically-lit since r155 — a dim ambient/directional
        // pair reads as crushed black, so both are pushed well above the
        // r155-era defaults; the point light stays as a cool rim accent.
        { ambientLight: null, intensity: 0.7 },
        {
          directionalLight: null,
          position: [5, 5, 5],
          intensity: 2.2,
          color: "#ffffff",
        },
        {
          pointLight: null,
          position: [-3, -2, -3],
          intensity: 40,
          color: "#7dd3fc",
        },
      ],
    }),
  ],
};

const App: DomphyElement<"div"> = {
  div: [panel, viewport],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(6),
    alignItems: "flex-start",
  },
};

export default App;
