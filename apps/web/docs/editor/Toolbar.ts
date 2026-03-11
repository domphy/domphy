import { DomphyElement, State } from '@domphy/core'
import { themeSpacing, themeColor } from "@domphy/theme"
import { icon, tooltip } from "@domphy/ui"

const dark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bulb-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M11.089 7.083a5 5 0 0 1 5.826 5.84m-1.378 2.611a5.012 5.012 0 0 1 -.537 .466a3.5 3.5 0 0 0 -1 3a2 2 0 1 1 -4 0a3.5 3.5 0 0 0 -1 -3a5 5 0 0 1 -.528 -7.544" /><path d="M9.7 17h4.6" /><path d="M3 3l18 18" /></svg>`
const light = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bulb"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" /><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" /><path d="M9.7 17l4.6 0" /></svg>`

const fullscreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrows-maximize"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 4l4 0l0 4" /><path d="M14 10l6 -6" /><path d="M8 20l-4 0l0 -4" /><path d="M4 20l6 -6" /><path d="M16 20l4 0l0 -4" /><path d="M14 14l6 6" /><path d="M8 4l-4 0l0 4" /><path d="M4 4l6 6" /></svg>`
const exit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrows-minimize"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 9l4 0l0 -4" /><path d="M3 3l6 6" /><path d="M5 15l4 0l0 4" /><path d="M3 21l6 -6" /><path d="M19 9l-4 0l0 -4" /><path d="M15 9l6 -6" /><path d="M19 15l-4 0l0 4" /><path d="M15 15l6 6" /></svg>`

const gridOn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-table-dashed"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2l0 -14" /><path d="M3 10h18" /><path d="M10 3v18" /></svg>`

const gridOff = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-table-off"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3h12a2 2 0 0 1 2 2v12m-.585 3.413a1.994 1.994 0 0 1 -1.415 .587h-14a2 2 0 0 1 -2 -2v-14c0 -.55 .223 -1.05 .583 -1.412" /><path d="M3 10h7m4 0h7" /><path d="M10 3v3m0 4v11" /><path d="M3 3l18 18" /></svg>`

export const Toolbar = (props: { isDark: State<boolean>, isFull: State<boolean>, hasGrid: State<boolean> }): DomphyElement<"div"> => {
    let { isDark, isFull, hasGrid } = props
    isFull.onChange((val) => {
        document.body.classList.toggle('fullscreen')
        document.querySelector('.VPNav')?.classList.toggle('fullscreen')
        document.querySelector('.VPContent')?.classList.toggle('has-sidebar')
        const root = document.documentElement
        const body = document.body

        if (val) {
            root.style.overflow = 'hidden'
            body.style.overflow = 'hidden'
            body.style.height = '100%'
        } else {
            root.style.overflow = ''
            body.style.overflow = ''
            body.style.height = ''
        }

    })
    const toggleGrid: DomphyElement<"span"> = {
        span: (listener) => hasGrid.get(listener) ? gridOff : gridOn,
        onClick: () => hasGrid.set(!hasGrid.get()),
        $: [
            icon(),
            tooltip({
                content: {
                    span: (listener) => hasGrid.get(listener) ? "Hide sizing grid" : "Show sizing grid",
                },
            }),
        ],
    }

    const toggleTheme: DomphyElement<"span"> = {
        span: (listener) => isDark.get(listener) ? light : dark,
        onClick: () => isDark.set(!isDark.get()),
        $: [
            icon(),
            tooltip({
                content: {
                    span: (listener) => isDark.get(listener) ? "Switch to light theme" : "Switch to dark theme",
                },
            }),
        ],
    }
    const toggleScreen: DomphyElement<"span"> = {
        span: (listener) => isFull.get(listener) ? exit : fullscreen,
        onClick: () => isFull.set(!isFull.get()),
        $: [
            icon(),
            tooltip({
                content: {
                    span: (listener) => isFull.get(listener) ? "Exit fullscreen preview" : "Enter fullscreen preview",
                },
            }),
        ],
    }

    return {
        div: [toggleGrid, toggleTheme, toggleScreen],
        style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: themeSpacing(3),
            padding: themeSpacing(1),
        }
    }
}
