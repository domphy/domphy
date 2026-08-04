import { type DomphyElement, toState } from "@domphy/core";
import {
  createFloating,
  type FloatingHandle,
  flip,
  offset,
  type Placement,
  shift,
} from "@domphy/floating";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost, heading, row, small, stack } from "@domphy/ui";

const placements: Placement[] = ["top", "right", "bottom", "left"];
const placement = toState<Placement>("bottom");
const posX = toState(0);
const posY = toState(0);

let handle: FloatingHandle | null = null;
let referenceElement: HTMLElement | null = null;
let floatingElement: HTMLElement | null = null;

function reconnect(): void {
  if (!referenceElement || !floatingElement) return;
  handle?.disconnect();
  handle = createFloating({
    placement: placement.get(),
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    // "absolute" (not "fixed"): the chip lives inside a positioned container,
    // so coordinates stay correct even inside the docs preview box, whose
    // `contain: layout` would hijack viewport-fixed positioning.
    strategy: "absolute",
  });
  // Bridge the imperative position stream back into Domphy reactivity —
  // the floating chip's style reads posX/posY with a listener.
  handle.onUpdate(({ x, y }) => {
    posX.set(x);
    posY.set(y);
  });
  handle.connect(referenceElement, floatingElement);
}

const App: DomphyElement<"div"> = {
  div: [
    { h2: "Anchor positioning without a framework", $: [heading()] },
    {
      div: placements.map(
        (p): DomphyElement<"button"> => ({
          button: p,
          $: [buttonGhost()],
          onClick: () => {
            placement.set(p);
            reconnect();
          },
          ariaPressed: (l) => placement.get(l) === p,
          style: {
            color: (l) => themeColor(l, "shift-9"),
            outline: (l) =>
              placement.get(l) === p
                ? `2px solid ${themeColor(l, "shift-9", "primary")}`
                : "none",
          },
        }),
      ),
      $: [row()],
    },
    {
      div: [
        {
          div: "Reference",
          dataReference: "",
          style: {
            padding: themeSpacing(6),
            outline: (l) => `1px dashed ${themeColor(l, "border-strong")}`,
            borderRadius: themeSpacing(2),
            color: (l) => themeColor(l, "muted"),
          },
        },
        {
          div: (l) => `Floating · ${placement.get(l)}`,
          dataFloating: "",
          // Solid brand chip, same recipe as button()'s solid variant:
          // deep shift-13 fill + shift-0 neutral text (mid-ramp fills fail
          // WCAG), with the doctor's surface rules silenced accordingly.
          _doctorDisable: [
            "low-contrast",
            "color-shift-minimum",
            "tone-background-inherit",
          ],
          style: {
            position: "absolute",
            left: (l) => `${posX.get(l)}px`,
            top: (l) => `${posY.get(l)}px`,
            padding: themeSpacing(3),
            borderRadius: themeSpacing(2),
            backgroundColor: (l) => themeColor(l, "shift-13", "primary"),
            color: (l) => themeColor(l, "shift-0", "neutral"),
            zIndex: 10,
          },
        },
      ],
      style: {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        padding: themeSpacing(16),
      },
    },
    {
      small:
        "createFloating() wraps computePosition + autoUpdate; flip()/shift() keep the chip in view when the placement changes.",
      $: [small()],
    },
  ],
  $: [stack()],
  _onMount: (node) => {
    const root = node.domElement as HTMLElement | null;
    referenceElement =
      root?.querySelector<HTMLElement>("[data-reference]") ?? null;
    floatingElement =
      root?.querySelector<HTMLElement>("[data-floating]") ?? null;
    reconnect();
  },
  _onRemove: () => {
    handle?.disconnect();
    handle = null;
  },
};

export default App;
