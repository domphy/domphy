import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { breadcrumb, breadcrumbEllipsis, link, strong } from "@domphy/ui";

// breadcrumb() does not paint color on any crumb — wrap the current item in
// strong() for the usual "reads stronger" emphasis (own bold weight + color).
const basic: DomphyElement<"nav"> = {
  nav: [
    { a: "Home", href: "#", $: [link()] },
    { a: "Products", href: "#", $: [link()] },
    { strong: "Wireless Headphones", ariaCurrent: "page", $: [strong()] },
  ],
  $: [breadcrumb()],
};

const chevron: DomphyElement<"nav"> = {
  nav: [
    { a: "Dashboard", href: "#", $: [link()] },
    { a: "Settings", href: "#", $: [link()] },
    { strong: "Profile", ariaCurrent: "page", $: [strong()] },
  ],
  $: [breadcrumb({ separator: "›" })],
};

const ellipsis: DomphyElement<"nav"> = {
  nav: [
    { a: "Home", href: "#", $: [link()] },
    { button: "…", $: [breadcrumbEllipsis()] },
    { a: "Category", href: "#", $: [link()] },
    { strong: "Current Page", ariaCurrent: "page", $: [strong()] },
  ],
  $: [breadcrumb()],
};

const App: DomphyElement<"div"> = {
  div: [basic, chevron, ellipsis],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
