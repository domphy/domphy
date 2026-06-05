import { themeVars, themeTokens, getTheme, themeName } from "./theme.js"
import light from "./light.js";
import type { Listener, ElementNode } from "@domphy/core";

const TONE_STEPS = light.colors.neutral.length

const ElementTones = ["inherit", "base"];

[...Array(TONE_STEPS).keys()].forEach(i => {
    ElementTones.push(`decrease-${i}`)
    ElementTones.push(`increase-${i}`)
    ElementTones.push(`shift-${i}`)
})

export type ElementTone = typeof ElementTones[number];

function adjustTone(tone: number, level: number): number {
    if (tone < 0 || tone > TONE_STEPS - 1) return tone
    let newIndex = tone + level;
    newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
    return newIndex
}

function shiftTone(tone: number, level: number): number {
    if (tone < 0 || tone > TONE_STEPS - 1) return tone
    let midpoint = Math.floor((TONE_STEPS - 1) / 2)
    let newIndex = tone <= midpoint ? tone + level : tone - level
    // Clamp overshoot to the near boundary. (Negating an out-of-range index, as
    // a prior version did, flips it to the opposite extreme — e.g. shift past
    // the dark end would land on the lightest tone.)
    newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
    return newIndex
}

function offsetTone(originTone: number, tone: ElementTone = "inherit"): number {

    if (typeof tone == "number") return tone

    if (tone == "inherit") return originTone

    if (!ElementTones.includes(tone!)) {
        throw Error(`tone name "${tone}" invalid`)
    }

    if (tone.startsWith("increase-")) {
        let offset = parseInt(tone.replace("increase-", ""), 10)
        return adjustTone(originTone, offset);

    } else if (tone.startsWith("decrease-")) {
        let offset = parseInt(tone.replace("decrease-", ""), 10)
        return adjustTone(originTone, - offset);

    } else if (tone.startsWith("shift-")) {
        let offset = parseInt(tone.replace("shift-", ""), 10)
        return shiftTone(originTone, offset);

    } else {
        return originTone
    }
}

function contextTone(object: ElementNode | Listener | null): number {

    if (!object) return 0
    let elementNode = (typeof object == "function" ? object.elementNode : object) as ElementNode
    let node: ElementNode = elementNode;
    while (node && (!node.attributes || !node.attributes.get("dataTone"))) {
        node = node.parent as ElementNode
    }

    let tone = 0

    if (node && node.attributes && node.attributes.has("dataTone")) {
        tone = offsetTone(tone, node.attributes.get("dataTone"))
        typeof object == "function" && node.attributes.addListener("dataTone", object)
    }
    return tone
}

function themeTone(object: ElementNode | Listener, tone: ElementTone = "inherit"): number {

    return offsetTone(contextTone(object), tone)
}

function biasContext(context: number, direction: string, bias: number): number {
    if (bias <= 0) return context
    if (direction === "lighten" && context === 0) return bias
    if (direction === "darken" && context === TONE_STEPS - 1) return TONE_STEPS - 1 - bias
    return context
}

export function themeColor(object: ElementNode | Listener | null, tone: ElementTone = "inherit", color: string = "inherit"): string {

    let themeColor = color == "inherit" ? "neutral" : color;

    if (!object) {
        // No node context implies the light theme (themeVars reads getTheme("light")).
        if (tone == "base") return themeVars()[themeColor][getTheme("light").baseTones[themeColor]]
        return themeVars()[themeColor][offsetTone(0, tone)]
    }

    const name = themeName(object)
    let resultTone: number
    if (tone == "base") {
        resultTone = getTheme(name).baseTones[themeColor]
    } else {
        let theme = getTheme(name)
        let context = biasContext(contextTone(object), theme.direction, theme.darkBias)
        resultTone = offsetTone(context, tone)
    }
    let colors = themeVars()[themeColor]
    if (!colors){
        throw Error(`color "${themeColor}" not found on theme "${name}"`)
    }
    let resultColor = colors[resultTone]

    return resultColor
}

export function themeColorToken(object: ElementNode | Listener | null, tone: ElementTone = "inherit", color: string = "inherit"): string {

    let colorName = color == "inherit" ? "neutral" : color;
    let name = object ? themeName(object as ElementNode | Listener) : "light";
    let tokens = themeTokens(name);

    if (!object) {
        if (tone == "base") return tokens[colorName][getTheme("light").baseTones[colorName]]
        return tokens[colorName][offsetTone(0, tone)]
    }

    let resultTone: number
    if (tone == "base") {
        resultTone = getTheme(name).baseTones[colorName]
    } else {
        let theme = getTheme(name)
        let context = biasContext(contextTone(object), theme.direction, theme.darkBias)
        resultTone = offsetTone(context, tone)
    }

    return tokens[colorName][resultTone]
}
