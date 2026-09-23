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
                // Solid brand fill, the same pair button({ variant: "solid" })
                // paints: shift-13 fill + shift-0 text measures 13.65:1 light /
                // 10.30:1 dark. The previous shift-6/shift-11 pair was 2.96:1.
                // A fixed-tone fill is the point of this box (it has to stay
                // visible while it moves), so the surface rules are disabled
                // here the way button() disables them.
                _doctorDisable: "tone-background-inherit",
                style: {
                  display: "grid",
                  placeItems: "center",
                  width: themeSpacing(24),
                  height: themeSpacing(16),
                  borderRadius: themeSpacing(2),
                  backgroundColor: (l) => themeColor(l, "shift-13", "primary"),
                  color: (l) => themeColor(l, "shift-0", "primary"),
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
