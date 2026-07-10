import { type DomphyElement, toState } from "@domphy/core";
import {
  themeColor,
  themeColorToken,
  themeDensity,
  themeSpacing,
  type ThemeColor,
} from "@domphy/theme";
import { three } from "@domphy/three";
import { button, small } from "@domphy/ui";

// One theme system, two renderers: the same State drives the DOM container's
// `dataTone` attribute AND the WebGL scene's material/background color.
//
// Note on themeColorToken(l, ...) inside a three() scene prop: themeColorToken
// only auto-tracks an ancestor's dataTone/dataTheme when called with a
// Listener that carries `.elementNode` — that's how @domphy/core wires it for
// ordinary DOM reactive props (ElementNode.ts / ElementAttribute.ts stamp it
// on). The listener a three() reactive prop hands to your function is a bare
// Handler with no `.elementNode` (see @domphy/three/src/props.ts
// applyReactiveProp), so it never inherits DOM tone context by itself — it
// still works as a plain function call, just without the tree-walk. The real
// bridge below is explicit: `activeColor` / `darkSurface` are read on BOTH
// sides, so DOM and scene update in lockstep because they share one source
// of truth, not because the scene "sees" the DOM.
const COLORS: ThemeColor[] = ["primary", "secondary", "success", "warning", "error"];
const activeColor = toState<ThemeColor>("primary");
const darkSurface = toState(false);

function surfaceTone(dark: boolean): "shift-0" | "shift-17" {
  return dark ? "shift-17" : "shift-0";
}

function backdropTone(dark: boolean): "shift-1" | "shift-15" {
  return dark ? "shift-15" : "shift-1";
}

const App: DomphyElement<"div"> = {
  div: [
    {
      // Canvas comes FIRST in DOM order and the controls are a narrow side
      // column: on a wide viewport they sit beside the canvas, on a narrow
      // one flex-wrap drops the controls onto their own line BELOW the
      // canvas — either way the mesh recolor is visible without scrolling
      // past a tall stack of controls first.
      div: [
        {
          div: null,
          style: {
            flex: "1 1 360px",
            minWidth: "280px",
            height: "380px",
            borderRadius: "12px",
            overflow: "hidden",
          },
          $: [
            three({
              camera: { position: [0, 1.5, 5] },
              // Camera position alone doesn't orient it — three() has no drei
              // OrbitControls-style `target` prop (SPEC.md: no drei port), so
              // pointing at the origin needs an explicit lookAt once at mount.
              onCreated: (root) => root.camera.lookAt(0, 0, 0),
              scene: [
                {
                  // No nested prop path exists on the node itself — the only
                  // way to update a `{ color: null, attach: "background" }`
                  // node reactively is a reactive `args` array (SPEC.md: an
                  // args change reconstructs the instance).
                  color: null,
                  attach: "background",
                  args: (l) => [
                    themeColorToken(l, backdropTone(darkSurface.get(l)), activeColor.get(l)),
                  ],
                },
                {
                  fog: null,
                  args: (l) => [
                    themeColorToken(l, backdropTone(darkSurface.get(l)), activeColor.get(l)),
                    4,
                    11,
                  ],
                },
                {
                  mesh: [
                    { torusKnotGeometry: null, args: [0.85, 0.28, 160, 24] },
                    {
                      meshStandardMaterial: null,
                      // A regular pierced prop this time — meshStandardMaterial
                      // already has a `.color` (a THREE.Color), so the reactive
                      // value applies via `.set()` instead of reconstruction.
                      // roughness/metalness away from the mirror-flat defaults
                      // so the surface actually shades (specular falloff +
                      // diffuse gradient) instead of reading as a flat fill.
                      color: (l) => themeColorToken(l, "shift-9", activeColor.get(l)),
                      roughness: 0.5,
                      metalness: 0.1,
                    },
                  ],
                  // Slow idle spin — just enough to read as alive, not spinning.
                  onFrame: (root, delta, self) => {
                    self.rotation.y += delta * 0.2;
                  },
                },
                { ambientLight: null, intensity: 0.8 },
                { directionalLight: null, position: [3, 5, 4], intensity: 2.5 },
              ],
            }),
          ],
        },
        {
          div: [
            {
              div: COLORS.map((name) => ({
                button: name.charAt(0).toUpperCase() + name.slice(1),
                type: "button",
                $: [button({ color: name })],
                onClick: () => activeColor.set(name),
                _key: name,
              })),
              style: {
                display: "flex",
                flexWrap: "wrap",
                gap: (l) => themeSpacing(themeDensity(l) * 2),
              },
            },
            {
              button: (l) =>
                darkSurface.get(l) ? "Switch to light surface" : "Switch to dark surface",
              type: "button",
              $: [button({ color: "neutral" })],
              onClick: () => darkSurface.set(!darkSurface.get()),
            },
            {
              small: (l) =>
                `Family: ${activeColor.get(l)} · Surface: ${darkSurface.get(l) ? "dark" : "light"}`,
              $: [small()],
            },
          ],
          style: {
            flex: "0 1 220px",
            minWidth: "200px",
            display: "flex",
            flexDirection: "column",
            gap: (l) => themeSpacing(themeDensity(l) * 2),
          },
        },
      ],
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: (l) => themeSpacing(3),
      },
    },
  ],
  dataTone: (l) => surfaceTone(darkSurface.get(l)),
  style: {
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "shift-9"),
    display: "flex",
    flexDirection: "column",
    gap: (l) => themeSpacing(3),
    padding: (l) => themeSpacing(4),
    borderRadius: (l) => themeSpacing(3),
  },
};

export default App;
