
import * as ui from "./index.js"
import * as core from "@domphy/core"
import * as theme from "@domphy/theme"

(globalThis as any).Domphy = {
    core,
    theme,
    ui
};