import { ThemeInput } from "./types.js";

let light: ThemeInput = {
  direction: "darken",
  colors: {
    highlight: ["#ffffff", "#fff8cc", "#fff197", "#ffde2c", "#f5c700", "#e6af00", "#d29500", "#c18300", "#af7400", "#9e6600", "#865500", "#724800", "#5d3b00", "#4b2f00", "#382300", "#281900", "#120b00", "#000000"],
    warning: ["#ffffff", "#fff6e7", "#ffeccf", "#ffda9e", "#ffc15e", "#ffa213", "#fc7d00", "#e86a00", "#d45b00", "#c24e00", "#a73e00", "#903300", "#762900", "#5f2000", "#491800", "#341200", "#190800", "#000000"],
    error: ["#ffffff", "#fff6f5", "#ffebe8", "#ffd6d1", "#ffbcb4", "#ff9d91", "#ff7665", "#ff513d", "#f03823", "#d73220", "#b72818", "#9c2113", "#811b0e", "#68150a", "#501006", "#3b0b04", "#1d0502", "#000000"],
    danger: ["#ffffff", "#fff6f5", "#ffebe8", "#ffd6d1", "#ffbcb4", "#ff9d91", "#ff7665", "#ff513d", "#f03823", "#d73220", "#b72818", "#9c2113", "#811b0e", "#68150a", "#501006", "#3b0b04", "#1d0502", "#000000"],
    secondary: ["#ffffff", "#fff6fc", "#ffe8f7", "#ffd3f0", "#ffb5e6", "#ff94db", "#ff67cc", "#f24cb8", "#e434a3", "#ce2a92", "#b01f7b", "#981668", "#800c55", "#690344", "#530035", "#3e0027", "#210015", "#000000"],
    primary: ["#ffffff", "#f5f9ff", "#e5f0fe", "#cbe2fe", "#accffd", "#8eb9fc", "#729efd", "#5d89ff", "#4b75ff", "#3b63fb", "#274dea", "#1d3ecf", "#1532ad", "#10288c", "#0c1f69", "#0e1843", "#070b1e", "#000000"],
    info: ["#ffffff", "#eefafe", "#d9f4fd", "#b7e7fc", "#8ad5ff", "#5cc0ff", "#30a7fe", "#1d95e7", "#1286cd", "#0b78b3", "#046691", "#005779", "#004762", "#00394e", "#002b3b", "#001f2b", "#000e14", "#000000"],
    success: ["#ffffff", "#edfcf1", "#d7f7e1", "#adeec5", "#6be3a2", "#2bd17d", "#12b867", "#0ba45d", "#079355", "#05834e", "#036e45", "#025d3c", "#014c34", "#003d2c", "#002e22", "#002119", "#000f0c", "#000000"],
    neutral: ["#ffffff", "#f7f7f7", "#efefef", "#dfdfdf", "#cccccc", "#b7b7b7", "#a0a0a0", "#8f8f8f", "#808080", "#727272", "#606060", "#515151", "#424242", "#343434", "#272727", "#1c1c1c", "#0c0c0c", "#000000"],
  },
  baseTones: {
    highlight: 5,
    warning: 6,
    error: 8,
    danger: 8,
    secondary: 8,
    primary: 9,
    info: 8,
    success: 8,
    neutral: 8,
  },
  fontSizes: ["0.75rem", "0.875rem", "1rem", "1.25rem", "1.5625rem", "1.9375rem", "2.4375rem", "3.0625rem"],
  densities: [0.75, 1, 1.5, 2, 2.5],
  custom: {},
}

export default light
