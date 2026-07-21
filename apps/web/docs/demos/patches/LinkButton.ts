import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { linkButton } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { a: "Outline", href: "#", $: [linkButton()] },
    {
      a: "Solid CTA",
      href: "#",
      $: [linkButton({ variant: "solid", color: "primary" })],
    },
    {
      a: "Ghost",
      href: "#",
      $: [linkButton({ variant: "ghost", color: "neutral" })],
    },
    { a: "Success", href: "#", $: [linkButton({ color: "success" })] },
    {
      a: "Small solid",
      href: "#",
      $: [linkButton({ variant: "solid", size: "small" })],
    },
    {
      a: "Disabled link",
      ariaDisabled: "true",
      href: "#",
      $: [linkButton({ color: "primary" })],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(3),
    alignItems: "center",
  },
};

export default App;
