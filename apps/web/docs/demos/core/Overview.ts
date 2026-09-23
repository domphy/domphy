import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

const count = toState(0);

const App: DomphyElement<"div"> = {
  div: [
    {
      h1: "Core Overview",
      style: {
        marginBlock: `0 ${themeSpacing(3)}`,
      },
    },
    {
      p: (listener) => `Count: ${count.get(listener)}`,
    },
    {
      button: "Increment",
      // Without it a <button> defaults to type="submit" and posts any enclosing form.
      type: "button",
      onClick: () => count.set(count.get() + 1),
      style: {
        paddingBlock: themeSpacing(2),
        paddingInline: themeSpacing(4),
      },
    },
  ],
};

export default App;
