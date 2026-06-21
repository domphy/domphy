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
  onClick: () => count.set(count.get() + 1),

  // Standard Nested CSS nesting
  style: {
    padding: `${themeSpacing(1)} ${themeSpacing(4)}`,
    backgroundColor: (listener) => themeColor(listener, "shift-9", "primary"),
    borderRadius: themeSpacing(1.5),
    color: (listener) => themeColor(listener, "inherit", "primary"),
    "&:hover": {
      backgroundColor: (listener) => themeColor(listener, "shift-7", "primary"),
    },
  },
};

const App: DomphyElement<"div"> = {
  div: [text, button],
};

export default App;
