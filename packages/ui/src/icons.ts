
const svg = (d: string) => `<svg viewBox="0 0 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`
const close = svg("M4 4 L16 16 M16 4 L4 16")
const bottom = svg("M5 7 L10 13 L15 7")
const top = svg("M5 13 L10 7 L15 13")
const right = svg("M7 5 L13 10 L7 15")
const left = svg("M13 5 L7 10 L13 15")
export {
    left,
    right,
    top,
    bottom,
    close
}
