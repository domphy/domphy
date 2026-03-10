import { type DomphyElement } from "@domphy/core"
import { button, menu, menuItem, popover } from "@domphy/ui"

const fileMenu: DomphyElement<"div"> = {
    div: [
        { button: "New File",   $: [menuItem()] },
        { button: "Open...",    $: [menuItem()] },
        { button: "Save",       $: [menuItem()] },
        { button: "Save As...", $: [menuItem()] },
    ],
    $: [menu()],
}

const editMenu: DomphyElement<"div"> = {
    div: [
        { button: "Undo",  $: [menuItem()] },
        { button: "Redo",  $: [menuItem()] },
        { button: "Cut",   $: [menuItem()] },
        { button: "Copy",  $: [menuItem()] },
        { button: "Paste", $: [menuItem()] },
    ],
    $: [menu()],
}

const viewMenu: DomphyElement<"div"> = {
    div: [
        { button: "Zoom In",  $: [menuItem()] },
        { button: "Zoom Out", $: [menuItem()] },
        { button: "Reset",    $: [menuItem()] },
    ],
    $: [menu()],
}

const App: DomphyElement<"nav"> = {
    nav: [
        { button: "File", $: [button(), popover({ openOn: "hover", content: fileMenu })] },
        { button: "Edit", $: [button(), popover({ openOn: "hover", content: editMenu })] },
        { button: "View", $: [button(), popover({ openOn: "hover", content: viewMenu })] },
    ],
    style: { display: "flex", gap: "0" },
}

export default App
