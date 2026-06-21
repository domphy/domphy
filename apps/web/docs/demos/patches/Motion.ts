import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { MotionKeyframe } from "@domphy/ui";
import { button, motion } from "@domphy/ui";

const shown = toState(true);
const pos = toState<MotionKeyframe>({ x: 0, opacity: 1, scale: 1 });

const App: DomphyElement<"div"> = {
  div: [
    {
      div: [
        {
          button: "Toggle (enter / exit)",
          $: [button()],
          onClick: () => shown.set(!shown.get()),
        },
        {
          button: "Move (reactive animate)",
          $: [button({ color: "primary" })],
          onClick: () =>
            pos.set({ x: pos.get().x === 0 ? 160 : 0, opacity: 1, scale: 1 }),
        },
      ],
      style: { display: "flex", gap: themeSpacing(2) },
    },
    {
      div: (l) =>
        shown.get(l)
          ? [
              {
                div: "Motion",
                $: [
                  motion({
                    initial: { opacity: 0, scale: 0.6 },
                    animate: pos,
                    exit: { opacity: 0, scale: 0.6 },
                    transition: { duration: 400 },
                  }),
                ],
                style: {
                  display: "grid",
                  placeItems: "center",
                  width: themeSpacing(24),
                  height: themeSpacing(16),
                  borderRadius: themeSpacing(2),
                  backgroundColor: (l) => themeColor(l, "shift-6", "primary"),
                  color: (l) => themeColor(l, "shift-11", "primary"),
                },
                _key: "box",
              },
            ]
          : [],
      style: { minHeight: themeSpacing(20), paddingBlock: themeSpacing(2) },
    },
  ],
  style: { display: "flex", flexDirection: "column", gap: themeSpacing(3) },
};

export default App;
