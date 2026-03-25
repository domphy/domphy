import { type DomphyElement, type Listener } from "@domphy/core";
import { button, card, tag, heading, paragraph } from "@domphy/ui";
import { themeSpacing, themeColor } from "@domphy/theme";

const dashed = {
    outline: (listener:Listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
    outlineOffset: "-1px"
};

const App: DomphyElement<"div"> = {
    div: [
        // Card 1: structure illustration
        {
            div: [
                { h4: "h4·title", $: [heading()], style: dashed },
                { p: "p · description", $: [paragraph()], style: dashed },
                { aside: "aside · extra" },
                { div: "div · content", style: dashed },
                { footer: ["footer · footer"]},
            ],
            $: [card()],
            style: { width: themeSpacing(64) },
        },
        // Card 2: real example
        {
            div: [
                {
                    img: null,
                    src: "https://picsum.photos/seed/domphy/600/200",
                    alt: "cover",
                    style: { height: themeSpacing(32), objectFit: "cover" },
                },
                { h4: "Getting Started", $: [heading()] },
                { p: "A concise introduction to the patch system.", $: [paragraph()] },
                { aside: "v1.0", $: [tag({ color: "primary" })] },
                { div: "Build UI components using composable patches and semantic HTML — no framework required." },
                {
                    footer: [
                        { button: "Learn More", $: [button({ color: "primary" })] },
                        { button: "Skip", $: [button()] },
                    ],
                },
            ],
            $: [card()],
            style: { width: themeSpacing(64) },
        },
    ],
    style: {
        display: "flex",
        flexWrap: "wrap",
        gap: themeSpacing(6),
        alignItems: "flex-start",
    },
}

export default App
