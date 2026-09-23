import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { link } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      a: "Link",
      href: "#",
      $: [link()],
    },
    // A disabled link has no `href` (nothing to navigate to) — WAI-ARIA's
    // pattern is role="link" + aria-disabled, kept in the tab order so
    // keyboard users can still find it. `<a disabled>` is not valid HTML.
    {
      a: "Disabled Link",
      role: "link",
      ariaDisabled: "true",
      tabindex: 0,
      $: [link()],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: themeSpacing(4),
    columnGap: themeSpacing(4),
  },
};

export default App;
