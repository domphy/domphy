import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { avatar, card, heading, link, paragraph, popover } from "@domphy/ui";

const profileCard: DomphyElement<"div"> = {
  div: [
    {
      img: null,
      src: "https://avatars.githubusercontent.com/u/1?v=4",
      $: [avatar()],
    },
    { h4: "@domphy", $: [heading()] },
    { p: "Building the web, declaratively.", $: [paragraph()] },
    { p: "42 followers · 18 following" },
  ],
  $: [card()],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
    maxWidth: themeSpacing(64),
  },
};

const App: DomphyElement<"a"> = {
  a: "@domphy",
  href: "#",
  $: [
    link(),
    popover({
      openOn: "hover",
      placement: "bottom-start",
      content: profileCard,
    }),
  ],
};

export default App;
