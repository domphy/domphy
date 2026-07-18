import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button } from "@domphy/ui";

const loading = toState(false);

const row = (children: DomphyElement[]): DomphyElement => ({
  div: children,
  style: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: themeSpacing(3),
    columnGap: themeSpacing(4),
  },
});

const App: DomphyElement<"div"> = {
  div: [
    row([
      { button: "Basic", $: [button()] },
      { button: "Primary", $: [button({ color: "primary" })] },
      { button: "Secondary", $: [button({ color: "secondary" })] },
      { button: "Success", $: [button({ color: "success" })] },
      { button: "Warning", $: [button({ color: "warning" })] },
      { button: "Danger", $: [button({ color: "danger" })] },
      {
        button: "Disabled",
        disabled: true,
        $: [button({ color: "primary" })],
      },
      {
        button: (l) => (loading.get(l) ? "Loading..." : "Click to Load"),
        ariaBusy: (l) => loading.get(l),
        onClick: () => {
          loading.set(true);
          setTimeout(() => loading.set(false), 2000);
        },
        $: [button({ color: "primary" })],
      },
    ]),
    // variant: outline (default) / solid / ghost
    row([
      { button: "Outline", $: [button({ color: "primary" })] },
      {
        button: "Solid",
        $: [button({ color: "primary", variant: "solid" })],
      },
      {
        button: "Ghost",
        $: [button({ color: "primary", variant: "ghost" })],
      },
      {
        button: "Solid danger",
        $: [button({ color: "danger", variant: "solid" })],
      },
    ]),
    // size: small / medium (default) / large
    row([
      { button: "Small", $: [button({ color: "primary", size: "small" })] },
      { button: "Medium", $: [button({ color: "primary", size: "medium" })] },
      { button: "Large", $: [button({ color: "primary", size: "large" })] },
    ]),
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    rowGap: themeSpacing(4),
  },
};

export default App;
