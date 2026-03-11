import { toState, type DomphyElement } from "@domphy/core"

const count = toState(0)

const App: DomphyElement<"div"> = {
  div: [
    {
      h1: "Core Overview",
      style: {
        marginBlock: "0 12px",
      },
    },
    {
      p: (listener) => `Count: ${count.get(listener)}`,
    },
    {
      button: "Increment",
      onClick: () => count.set(count.get() + 1),
      style: {
        paddingBlock: "8px",
        paddingInline: "16px",
      },
    },
  ],
}

export default App
