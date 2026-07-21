import { scrollProgress } from "@domphy/blocks";
import { paragraph } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

// In-flow demo stage: fixed-to-viewport progress is also staged as absolute
// inside this relative host so catalog cell screenshots capture the bar.
export default {
  div: [
    scrollProgress({
      thickness: 1.5,
      style: {
        position: "absolute",
        insetBlockStart: 0,
        insetInlineStart: 0,
        width: "100%",
        zIndex: 1,
      },
    }),
    {
      p: "Scroll progress",
      $: [paragraph()],
      style: {
        marginTop: themeSpacing(6),
        color: (l) => themeColor(l, "text"),
      },
    },
  ],
  style: {
    position: "relative",
    minWidth: "280px",
    minHeight: "96px",
    padding: themeSpacing(4),
    boxSizing: "border-box",
  },
};
