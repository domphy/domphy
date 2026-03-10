import { DomphyElement } from '@domphy/core'
import { code, paragraph } from "@domphy/ui"

const App: DomphyElement<"p"> = {
    p: [
        { code: "const x = 1", $: [code()] },
        ` Lorem ipsum dolor sit amet, consectetur adipiscing elit.
         Urgent tamen et nihil remittunt. Et non ex maxima parte de tota iudicabis?
          Beatum, inquit. Ille incendat?`
    ],
    $: [paragraph()],
}

export default App
