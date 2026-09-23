import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

// Create a State instance
const count = toState(0);

const text: DomphyElement<"p"> = {
  // Reactive values can be reactive functions.
  // Reading state with `count.get(listener)` also add listener to state.
  // State change => call listener => re render property
  p: (listener) => `Count: ${count.get(listener)}`,
};

const button: DomphyElement<"button"> = {
  button: "Increment",
  // Without it a <button> defaults to type="submit" and posts any enclosing form.
  type: "button",
  onClick: () => count.set(count.get() + 1),

  // Deliberate solid fill: a fixed shifted background is exactly what
  // "tone-background-inherit" flags — suppress it like button({variant:"solid"}) does.
  _doctorDisable: "tone-background-inherit",

  // Standard Nested CSS nesting
  style: {
    padding: `${themeSpacing(1)} ${themeSpacing(4)}`,
    backgroundColor: (listener) => themeColor(listener, "shift-9", "primary"),
    borderRadius: themeSpacing(1.5),
    color: (listener) => themeColor(listener, "inherit", "primary"),
    "&:hover": {
      // Hover steps the solid fill DEEPER (+1), the way button({variant:"solid"})
      // does. Lightening it to shift-7 pulled the fill toward the shift-0 label
      // and collapsed the gap to 7 steps.
      backgroundColor: (listener) =>
        themeColor(listener, "shift-10", "primary"),
    },
  },
};

const App: DomphyElement<"div"> = {
  div: [text, button],
};

export default App;
