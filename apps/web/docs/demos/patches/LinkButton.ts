import { type DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { linkButton } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { a: "Open app", href: "#", $: [linkButton()] },
    { a: "Settings", href: "#", $: [linkButton({ color: "neutral" })] },
    { a: "Success action", href: "#", $: [linkButton({ color: "success" })] },
    {
      a: "Disabled link",
      "aria-disabled": "true",
      href: "#",
      $: [linkButton({ color: "primary" })],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(3),
  },
};

export default App;
