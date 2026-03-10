import { type DomphyElement } from '@domphy/core'
import { image } from "@domphy/ui"
import { themeSpacing } from "@domphy/theme"

const chart = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f7cff" />
      <stop offset="100%" stop-color="#2bc5a1" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="640" height="360" rx="18" fill="url(#bg)" />
  <polyline points="60,260 160,210 260,230 360,150 460,180 560,100" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`)}`;

const App: DomphyElement<"div"> = {
    div: [
        {
            img: null,
            src: chart,
            alt: "Sales trend chart",
            $: [image()],
        },
        {
            img: null,
            src: chart,
            alt: "Sales trend chart secondary",
            $: [image({ color: "primary" })],
            style: {
                maxWidth: themeSpacing(56),
            },
        },
    ],
    style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
    },
}

export default App
