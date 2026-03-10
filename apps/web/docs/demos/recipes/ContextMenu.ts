import { type DomphyElement, toState } from "@domphy/core"
import { menu, menuItem } from "@domphy/ui"

const open = toState(false)
const x = toState(0)
const y = toState(0)

const contextMenu: DomphyElement<"div"> = {
    div: [
        { button: "Cut",   $: [menuItem()], onClick: () => open.set(false) },
        { button: "Copy",  $: [menuItem()], onClick: () => open.set(false) },
        { button: "Paste", $: [menuItem()], onClick: () => open.set(false) },
    ],
    $: [menu()],
    style: {
        position: "fixed",
        left: (listener) => `${x.get(listener)}px`,
        top: (listener) => `${y.get(listener)}px`,
        zIndex: 50,
        minWidth: "10rem",
        display: (listener) => open.get(listener) ? "flex" : "none",
        pointerEvents: (listener) => open.get(listener) ? "auto" : "none",
    },
    _onMount: (node) => {
        const close = (e: MouseEvent) => {
            if (!node.domElement!.contains(e.target as Node)) open.set(false)
        }
        document.addEventListener("click", close)
        node.addHook("Remove", () => document.removeEventListener("click", close))
    },
}

const App: DomphyElement<"div"> = {
    div: [
        { p: "Right-click anywhere in this area" },
        contextMenu,
    ],
    style: {
        padding: "2rem",
        userSelect: "none",
        minHeight: "8rem",
        border: "2px dashed currentColor",
        borderRadius: "0.5rem",
        cursor: "context-menu",
    },
    onContextMenu: (e: MouseEvent) => {
        e.preventDefault()
        x.set((e as MouseEvent).clientX)
        y.set((e as MouseEvent).clientY)
        open.set(true)
    },
}

export default App
