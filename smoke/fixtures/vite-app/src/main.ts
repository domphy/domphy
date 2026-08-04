import { type DomphyElement, ElementNode, toState } from "@domphy/core";
import { applySystemTheme, themeApply } from "@domphy/theme";
import { button, heading, stack } from "@domphy/ui";

// Apply the design tokens once, then follow the OS light/dark preference.
themeApply();
applySystemTheme();

const count = toState(0);

const App: DomphyElement<"div"> = {
  div: [
    { h2: (listener) => `Count: ${count.get(listener)}`, $: [heading()] },
    {
      button: "Increment",
      onClick: () => count.set(count.get() + 1),
      $: [button({ color: "primary", variant: "solid" })],
    },
  ],
  $: [stack({ gap: 4 })],
};

const root = document.getElementById("app");
if (root) {
  new ElementNode(App).render(root);
}
