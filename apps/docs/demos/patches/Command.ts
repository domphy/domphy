import { type DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { command, commandSearch, commandItem } from "@domphy/ui"

const App: DomphyElement<"div"> = {
    div: [
        { input: null, $: [commandSearch()], placeholder: "Search..." },
        { div: "New File",     $: [commandItem()], role: "button" },
        { div: "Open Folder",  $: [commandItem()], role: "button" },
        { div: "Save As...",   $: [commandItem()], role: "button" },
        { div: "Run Tests",    $: [commandItem()], role: "button" },
        { div: "Close Editor", $: [commandItem()], role: "button" },
    ],
    $: [command()],
    style: { width: themeSpacing(60) },
}

export default App
