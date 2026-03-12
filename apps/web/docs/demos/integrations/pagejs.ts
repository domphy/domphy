import { toState, type DomphyElement } from "@domphy/core"
import { themeSpacing } from "@domphy/theme"
import { button, heading, paragraph } from "@domphy/ui"
import page from "page"

// --- Route State ---
const route = toState("/")
const params = toState<Record<string, string>>({})

// --- Route Definitions ---
page("/", () => route.set("/"))
page("/about", () => route.set("/about"))
page("/users/:id", (ctx) => {
    params.set(ctx.params)
    route.set("/users/:id")
})
page.start()

// --- Pages ---
const Home: DomphyElement<"div"> = {
    div: [
        { h1: "Home", $: [heading()] },
        { p: "Welcome to Domphy.", $: [paragraph()] },
    ],
}

const About: DomphyElement<"div"> = {
    div: [
        { h1: "About", $: [heading()] },
        { p: "A lightweight UI engine.", $: [paragraph()] },
    ],
}

const UserDetail: DomphyElement<"div"> = {
    div: [
        { h1: "User", $: [heading()] },
        { p: (listener) => `User ID: ${params.get(listener).id}`, $: [paragraph()] },
    ],
}

// --- Router View ---
const RouterView: DomphyElement<"div"> = {
    div: (listener) => {
        switch (route.get(listener)) {
            case "/": return Home
            case "/about": return About
            case "/users/:id": return UserDetail
            default: return { p: "404 — Page not found", $: [paragraph()] }
        }
    },
}

// --- Nav ---
const Nav: DomphyElement<"nav"> = {
    nav: [
        { button: "Home",       $: [button()], onClick: () => page("/") },
        { button: "About",      $: [button()], onClick: () => page("/about") },
        { button: "User 42",    $: [button()], onClick: () => page("/users/42") },
    ],
    style: {
        display: "flex",
        gap: themeSpacing(9),
    },
}

const App: DomphyElement<"div"> = {
    div: [Nav, RouterView],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(9),
    },
}

export default App
