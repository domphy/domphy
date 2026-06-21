import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { breadcrumb, breadcrumbEllipsis, link } from "@domphy/ui";

// Basic ellipsis trigger inside a breadcrumb
const basic: DomphyElement<"nav"> = {
  nav: [
    { a: "Home", href: "#", $: [link()] },
    { button: "…", $: [breadcrumbEllipsis()] },
    { a: "Docs", href: "#", $: [link()] },
    { span: "Getting Started", ariaCurrent: "page" },
  ],
  $: [breadcrumb()],
};

// With explicit neutral color
const neutral: DomphyElement<"nav"> = {
  nav: [
    { a: "Home", href: "#", $: [link()] },
    { button: "•••", $: [breadcrumbEllipsis({ color: "neutral" })] },
    { span: "Current Page", ariaCurrent: "page" },
  ],
  $: [breadcrumb()],
};

// With a different color tone
const accent: DomphyElement<"nav"> = {
  nav: [
    { a: "Home", href: "#", $: [link()] },
    { button: "…", $: [breadcrumbEllipsis({ color: "primary" })] },
    { a: "Components", href: "#", $: [link()] },
    { span: "breadcrumbEllipsis", ariaCurrent: "page" },
  ],
  $: [breadcrumb()],
};

const App: DomphyElement<"div"> = {
  div: [basic, neutral, accent],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
