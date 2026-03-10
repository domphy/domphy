import { type DomphyElement } from '@domphy/core'
import {
    abbreviation, blockquote, code, descriptionList, emphasis,
    heading, keyboard, link, mark, orderedList, paragraph,
    preformated, small, strong, subscript, superscript, unorderedList,
} from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
    div: [
        { h1: "Heading 1", $: [heading()] },
        { h2: "Heading 2", $: [heading()] },
        { h3: "Heading 3", $: [heading()] },
        { h4: "Heading 4", $: [heading()] },
        { h5: "Heading 5", $: [heading()] },
        { h6: "Heading 6", $: [heading()] },
        {
            p: [
                "The ",
                { strong: "quick brown fox", $: [strong()] },
                " jumps over the ",
                { em: "lazy", $: [emphasis()] },
                " dog. Press ",
                { kbd: "Ctrl+K", $: [keyboard()] },
                " to search. Visit ",
                { a: "the docs", href: "#", $: [link()] },
                " for ",
                { code: "more()", $: [code()] },
                " info. H",
                { sub: "2", $: [subscript()] },
                "O and x",
                { sup: "2", $: [superscript()] },
                " with ",
                { mark: "highlighted", $: [mark()] },
                " text, ",
                { abbr: "API", title: "Application Programming Interface", $: [abbreviation()] },
                " abbreviation, and ",
                { small: "fine print", $: [small()] },
                ".",
            ],
            $: [paragraph()],
        },
        {
            blockquote: "The best way to predict the future is to invent it.",
            $: [blockquote()],
        },
        { pre: "const x = 1\nconsole.log(x)", $: [preformated()] },
        {
            ol: [{ li: "Item one" }, { li: "Item two" }, { li: "Item three" }],
            $: [orderedList()],
        },
        {
            ul: [{ li: "Item one" }, { li: "Item two" }, { li: "Item three" }],
            $: [unorderedList()],
        },
        {
            dl: [
                { dt: "Framework" }, { dd: "Domphy UI" },
                { dt: "Language" }, { dd: "TypeScript" },
            ],
            $: [descriptionList()],
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
