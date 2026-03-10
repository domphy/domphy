import { toState, type DomphyElement } from "@domphy/core";

// Create a State instance
const count = toState(0);

const text: DomphyElement<"p"> = {
  // Reactive values can be reactive functions.
  // Reading state with `count.get(listener)` also add listener to state. 
  // State change => call listener => re render property
  p: (listener) => `Count: ${count.get(listener)}`
};

const button: DomphyElement<"button"> = {
  button: "Increment",
  onClick: () => count.set(count.get() + 1),

  // Standard Nested CSS nesting
  style: {
    padding: "4px 16px",
    backgroundColor: "#0f62fe",
    borderRadius: "6px",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#4589ff"
    }
  }
};

const App: DomphyElement<"div"> = {
  div: [text, button]
};

export default App;
