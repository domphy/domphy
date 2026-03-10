import { DomphyElement } from '@domphy/core'
import { themeSpacing } from "@domphy/theme"
import { breadcrumb, breadcrumbEllipsis, link } from "@domphy/ui"

const basic: DomphyElement<"nav"> = {
    nav: [
        { a: "Home", href: "#", $: [link()] },
        { a: "Products", href: "#", $: [link()] },
        { span: "Wireless Headphones", ariaCurrent: "page" },
    ],
    $: [breadcrumb()],
}

const chevron: DomphyElement<"nav"> = {
    nav: [
        { a: "Dashboard", href: "#", $: [link()] },
        { a: "Settings", href: "#", $: [link()] },
        { span: "Profile", ariaCurrent: "page" },
    ],
    $: [breadcrumb({ separator: "›" })],
}

const ellipsis: DomphyElement<"nav"> = {
    nav: [
        { a: "Home", href: "#", $: [link()] },
        { button: "…", $: [breadcrumbEllipsis()] },
        { a: "Category", href: "#", $: [link()] },
        { span: "Current Page", ariaCurrent: "page" },
    ],
    $: [breadcrumb()],
}

const App: DomphyElement<"div"> = {
    div: [basic, chevron, ellipsis],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
