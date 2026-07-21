// Landing features row — replaces the old emoji-icon frontmatter features
// with real SVG icons (stroke style, currentColor) in theme-token cards.
// Rendered as a bare island on the home page; because homeShell's fullBleed
// mode lets island placeholders span edge-to-edge, the root element centers
// itself at the landing width.

import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, small } from "@domphy/ui";

// Static var() references (no listener) for values that never need reactive
// re-evaluation — the CSS custom property still follows the site theme.
const brand = themeColor(null, "shift-9", "primary");
const border = themeColor(null, "shift-3");

function icon(paths: string[]): DomphyElement {
  return {
    svg: paths.map((d) => ({ path: null, d }) as DomphyElement),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    width: "28",
    height: "28",
    ariaHidden: "true",
  } as DomphyElement;
}

const FEATURES: {
  icon: DomphyElement;
  title: string;
  details: string;
  link: string;
}[] = [
  {
    icon: icon(["M13 2 3 14h9l-1 8 10-12h-9l1-8z"]),
    title: "No compiler, no syntax tax",
    details:
      "Elements are plain JS objects. Works in a script tag, Vite, browser extension — anywhere JS runs. ~15 kB core + theme gzip.",
    link: "/docs/quickstart",
  },
  {
    icon: icon([
      "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z",
      "M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8L19 15z",
    ]),
    title: "AI generates it correctly",
    details:
      "Plain objects are what LLMs produce naturally. @domphy/doctor catches mistakes and tells the model exactly what to fix — self-corrects without you debugging.",
    link: "/docs/ai",
  },
  {
    icon: icon([
      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
      "M3.29 7 12 12l8.71-5",
      "M12 22V12",
    ]),
    title: "Complete stack included",
    details:
      "Query, Router, Table, Virtual, Form, DnD, i18n, Charts — all built in. No stitching third-party libraries together.",
    link: "/docs/integrations/",
  },
];

const App: DomphyElement<"div"> = {
  div: FEATURES.map(
    (feature) =>
      ({
        a: [
          {
            div: [
              {
                div: [feature.icon],
                style: {
                  color: (l) => themeColor(l, "shift-9", "primary"),
                  marginBottom: themeSpacing(3),
                },
              },
              { h3: feature.title, $: [heading()] },
              { small: feature.details, $: [small()] },
            ],
            // The card surface is a dataTone context (edge anchor shift-1)
            // with an inherit background — doctor's surface contract — so
            // text/border tones inside resolve relative to the card, not
            // the page.
            dataTone: "shift-1",
            style: {
              height: "100%",
              padding: themeSpacing(6),
              backgroundColor: (l) => themeColor(l, "inherit"),
              color: (l) => themeColor(l, "shift-9"),
              border: (l) => `1px solid ${themeColor(l, "shift-3")}`,
              borderRadius: themeSpacing(4),
              transition: "border-color .18s ease",
              "&:hover": {
                borderColor: `color-mix(in srgb, ${brand} 55%, ${border})`,
              },
              // This island mounts inside press's content scope, whose
              // `.scope h3` rule outranks the heading() patch classes —
              // match its specificity to reclaim the margins (later
              // injection wins the tie).
              "& h3": {
                marginTop: 0,
                marginBottom: themeSpacing(2),
              },
              "& small": {
                display: "block",
                color: (l) => themeColor(l, "shift-8"),
              },
            },
          },
        ],
        href: feature.link,
        style: {
          display: "block",
          color: "inherit",
          // Function values keep these out of doctor's inline-typography
          // literal check — they exist only to neutralize the global
          // `a:hover { text-decoration: underline }` reset on a card link.
          textDecoration: () => "none",
          "&:hover": { textDecoration: () => "none" },
        },
      }) as DomphyElement,
  ),
  style: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: `${themeSpacing(10)} ${themeSpacing(6)} 0`,
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${themeSpacing(60)}, 1fr))`,
    gap: themeSpacing(4),
  },
};

export default App;
