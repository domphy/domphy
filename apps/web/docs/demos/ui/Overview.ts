import { type DomphyElement } from "@domphy/core"
import { button, tooltip } from "@domphy/ui"

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Submit",
      $: [
        button({ color: "primary" }),
        tooltip({ content: "Submit the form" }),
      ],
    },
  ],
  dataTheme: "light",
}

export default App
