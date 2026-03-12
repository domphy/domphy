import { ThemeInput } from "./types.js";

let light: ThemeInput = {
  direction: "darken",
  colors: {
    highlight: ["#ffffff", "#fcf4d6", "#fddc69", "#f1c21b", "#d2a106", "#b28600", "#8e6a00", "#684e00", "#483700", "#302400", "#1c1500", "#000000"],
    warning: ["#ffffff", "#fff2e8", "#ffd9be", "#ffb784", "#ff832b", "#eb6200", "#ba4e00", "#8a3800", "#5e2900", "#3e1a00", "#231000", "#000000"],
    error: ["#ffffff", "#fff1f1", "#ffd7d9", "#ffb3b8", "#ff8389", "#fa4d56", "#da1e28", "#a2191f", "#750e13", "#520408", "#2d0709", "#000000"],
    danger: ["#ffffff", "#fff1f1", "#ffd7d9", "#ffb3b8", "#ff8389", "#fa4d56", "#da1e28", "#a2191f", "#750e13", "#520408", "#2d0709", "#000000"],
    secondary: ["#ffffff", "#fff0f7", "#ffd6e8", "#ffafd2", "#ff7eb6", "#ee5396", "#d02670", "#9f1853", "#740937", "#510224", "#2a0a18", "#000000"],
    primary: ["#ffffff", "#edf5ff", "#d0e2ff", "#a6c8ff", "#78a9ff", "#4589ff", "#0f62fe", "#0043ce", "#002d9c", "#001d6c", "#001141", "#000000"],
    info: ["#ffffff", "#e5f6ff", "#bae6ff", "#82cfff", "#33b1ff", "#1192e8", "#0072c3", "#00539a", "#003a6d", "#012749", "#061727", "#000000"],
    success: ["#ffffff", "#defbe6", "#a7f0ba", "#6fdc8c", "#42be65", "#24a148", "#198038", "#0e6027", "#044317", "#022d0d", "#071908", "#000000"],
    neutral: ["#ffffff", "#f4f4f4", "#e0e0e0", "#c6c6c6", "#a8a8a8", "#8d8d8d", "#6f6f6f", "#525252", "#393939", "#262626", "#161616", "#000000"],
  },
  baseTones: {
    highlight: 3,
    warning: 4,
    error: 5,
    secondary: 5,
    primary: 6,
    info: 5,
    success: 5,
    neutral: 5,
  },
  fontSizes: ["0.75rem", "0.875rem", "1rem", "1.25rem", "1.5625rem", "1.9375rem", "2.4375rem", "3.0625rem"],
// pixels: 12 | 14 | 16 | 20 | 25 | 31 | 39 | 49
  densities:[0.75, 1, 1.5, 2, 2.5],
  // em [0.1875, 0.25, 0.375, 0.5, 0.625],
  //px [3,4,6,8,10]
  custom: {},
}

export default light
