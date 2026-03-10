import { themeVars, getTheme, themeName } from "./theme.js"
import type { Listener, ElementNode } from "@domphy/core";

const TONE_STEPS = 12

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
    let newIndex = tone <= 5 ? tone + level : tone - level
    newIndex = newIndex < 0 || newIndex > TONE_STEPS - 1 ? - newIndex : newIndex
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
        typeof object == "function" && node.attributes.onChange("dataTone", object)
    }
    return tone
}

function themeTone(object: ElementNode | Listener, tone: ElementTone = "inherit"): number {

    return offsetTone(contextTone(object), tone)
}

export function contextColor(object: ElementNode | Listener, tone: ElementTone = "inherit", color: string = "inherit"): string {
    let elementNode = (typeof object == "function" ? object.elementNode : object) as ElementNode

    let themeColor = color == "inherit" ? elementNode.getContext("themeColor") || "neutral" : color;

    let resultTone: number
    if (tone == "base") {
        resultTone = getTheme(themeName(object)).baseTones[themeColor]
    } else {
        resultTone = offsetTone(contextTone(object), tone)
    }
    let resultColor = themeVars()[themeColor][resultTone]

    return resultColor
}
export function themeColor(object: ElementNode | Listener | null, tone: ElementTone = "inherit", color: string = "inherit"): string {

    let themeColor = color == "inherit" ? "neutral" : color;

    if (!object) {
        return themeVars()[themeColor][offsetTone(0, tone)]
    }

    let resultTone: number
    if (tone == "base") {
        resultTone = getTheme(themeName(object)).baseTones[themeColor]
    } else {
        resultTone = themeTone(object, tone)
    }
    let resultColor = themeVars()[themeColor][resultTone]

    return resultColor
}
