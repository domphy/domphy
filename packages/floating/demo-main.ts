// Real-browser demo for the e2e lane (playwright.config.ts). Wires two
// trigger/panel pairs through createFloating() — the stateful Popper.js-
// equivalent manager this package ships — so the e2e specs can assert real
// computed x/y, a real flip() near a viewport edge, and a real autoUpdate
// reposition on scroll. jsdom (createFloating.test.ts) stubs
// getBoundingClientRect and never runs a real layout/scroll pass.

import type { FloatingHandle } from "./src/index.js";
import { createFloating, flip, offset, shift } from "./src/index.js";

function wire(
  triggerId: string,
  panelId: string,
  placement: "bottom" | "top" | "right",
  strategy: "absolute" | "fixed" = "absolute",
) {
  const trigger = document.getElementById(triggerId) as HTMLButtonElement;
  const panel = document.getElementById(panelId) as HTMLDivElement;
  const handle: FloatingHandle = createFloating({
    placement,
    strategy,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  let open = false;

  function apply(): void {
    const position = handle.position;
    if (!position) return;
    panel.style.left = `${position.x}px`;
    panel.style.top = `${position.y}px`;
    panel.dataset.placement = position.placement;
  }

  handle.onUpdate(apply);

  function show(): void {
    if (open) return;
    open = true;
    panel.dataset.open = "true";
    handle.connect(trigger, panel);
    apply();
  }

  function hide(): void {
    if (!open) return;
    open = false;
    panel.dataset.open = "false";
    handle.disconnect();
  }

  trigger.addEventListener("click", () => (open ? hide() : show()));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) hide();
  });
  document.addEventListener("click", (event) => {
    if (!open) return;
    const target = event.target as Node;
    if (target !== trigger && !panel.contains(target)) hide();
  });
}

wire("anchor-top", "panel-top", "bottom");
wire("anchor-bottom", "panel-bottom", "bottom");
wire("anchor-scroll", "panel-scroll", "right", "fixed");
