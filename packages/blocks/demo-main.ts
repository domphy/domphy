import { ElementNode } from "@domphy/core";
import type { DomphyElement } from "@domphy/core";
import { themeApply } from "@domphy/theme";
import * as blocks from "./src/index.js";

// Every block renders via themeColor()/themeSpacing() CSS-variable
// references — without applying the theme CSS and picking an active theme,
// those variables are undefined and everything using them (backgrounds,
// borders, most text) resolves to nothing, leaving only elements with
// hardcoded fills (e.g. inline SVG `fill: currentColor` glyphs) visible.
themeApply();
document.documentElement.setAttribute("data-theme", "light");

// Mounting all 252 blocks eagerly on one page exhausts the browser's WebGL
// context budget (several blocks — globe3D, retroGrid, iconCloud, etc. — use
// WebGL) and is wasteful when the visual-compare script only needs to
// screenshot one at a time. Instead, create every card shell up front but
// defer the actual factory-call + render until each card scrolls near the
// viewport, mirroring how a real consuming app would only ever mount a
// handful of these at once.

const list = document.getElementById("list")!;

function card(name: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "card";
  wrapper.id = `block-${name}`;
  wrapper.dataset.block = name;
  wrapper.innerHTML = `<h2>${name}</h2>`;
  const box = document.createElement("div");
  box.className = "block-box";
  box.textContent = "(scroll into view to render)";
  wrapper.appendChild(box);
  list.appendChild(wrapper);
  return box;
}

function mount(
  name: string,
  factory: (props?: unknown) => DomphyElement,
  box: HTMLElement,
  props?: unknown,
): void {
  box.textContent = "";
  try {
    new ElementNode(factory(props)).render(box);
  } catch (error) {
    box.innerHTML = `<div class="error">ERROR: ${String(error instanceof Error ? (error.stack ?? error.message) : error)}</div>`;
    console.error(`[demo] ${name} failed:`, error);
  }
}

const entries = Object.entries(blocks as Record<string, unknown>)
  .filter((entry): entry is [string, () => DomphyElement] => typeof entry[1] === "function")
  .sort(([a], [b]) => a.localeCompare(b));

const mounted = new Set<string>();
const observer = new IntersectionObserver(
  (observedEntries) => {
    for (const observed of observedEntries) {
      if (!observed.isIntersecting) continue;
      const name = (observed.target as HTMLElement).dataset.block!;
      if (mounted.has(name)) continue;
      mounted.add(name);
      observer.unobserve(observed.target);
      const factory = blocks[name as keyof typeof blocks] as unknown as () => DomphyElement;
      const box = observed.target.querySelector(".block-box") as HTMLElement;
      mount(name, factory, box);
    }
  },
  { rootMargin: "400px 0px" },
);

for (const [name, factory] of entries) {
  const box = card(name);
  observer.observe(box.parentElement!);
  // The compare script drives this via scrollIntoViewIfNeeded on the
  // wrapper; also expose a direct mount function for it (or any manual
  // testing) to force-render a specific block without scrolling.
  (box.parentElement as HTMLElement).dataset.mount = "lazy";
  void factory;
}

// Exposed for the visual-compare script / manual debugging: force-mount a
// block by name immediately instead of waiting for IntersectionObserver.
// The optional `props` argument lets interaction-check scripts exercise a
// prop that's off by default in the demo's zero-arg render (e.g.
// stickyBanner's `hideOnScroll`) without needing a second bespoke mount path.
(window as unknown as { mountBlock: (name: string, props?: unknown) => void }).mountBlock = (
  name: string,
  props?: unknown,
) => {
  if (mounted.has(name)) return;
  const factory = blocks[name as keyof typeof blocks] as unknown as
    | ((props?: unknown) => DomphyElement)
    | undefined;
  const wrapper = document.getElementById(`block-${name}`);
  const box = wrapper?.querySelector(".block-box") as HTMLElement | null;
  if (!factory || !box) return;
  mounted.add(name);
  observer.unobserve(wrapper!);
  mount(name, factory, box, props);
};

// Exposed for the visual-compare script: stop the IntersectionObserver from
// mounting any other card while it scrolls toward and screenshots one
// specific block. Without this, scrolling past dozens of earlier
// alphabetical cards can trigger them to mount too — replacing their
// placeholder text with real (differently-sized) content and shifting the
// target block's position between when its clip rect is measured and when
// the screenshot actually fires.
(window as unknown as { disconnectLazyMount: () => void }).disconnectLazyMount = () => {
  observer.disconnect();
};

// Exposed for interaction-check scripts that need to exercise a NON-default
// prop combination the default-props demo instance can't reach (e.g.
// compareSlider's `autoplay`, which defaults to `false`). Mounts a fresh
// instance with caller-supplied props into a brand-new container appended to
// `<body>`, entirely separate from the default-props instance `mountBlock()`
// already rendered — so it doesn't disturb whatever the harness is asserting
// against that one.
(window as unknown as { mountBlockWithProps: (name: string, elementId: string, props: unknown) => void }).mountBlockWithProps = (
  name: string,
  elementId: string,
  props: unknown,
) => {
  const factory = blocks[name as keyof typeof blocks] as unknown as ((p: unknown) => DomphyElement) | undefined;
  if (!factory) return;
  const container = document.createElement("div");
  container.id = elementId;
  document.body.appendChild(container);
  new ElementNode(factory(props)).render(container);
};

console.log(`[demo] ${entries.length} blocks registered (lazy-mount on scroll into view)`);
