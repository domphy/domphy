import type { ElementNode, Listener } from "@domphy/core";
import { themeVars } from "./theme.js";

const ElementSizes = ["inherit"];

[...Array(8).keys()].forEach(i =>{
    ElementSizes.push(`decrease-${i}`)
    ElementSizes.push(`increase-${i}`)
})

export type ElementSize = typeof ElementSizes[number];

function offsetSize(origin: number, size: ElementSize = "inherit"): number {

    if (!ElementSizes.includes(size!)) {
        throw Error(`size name "${size}" invalid`)
    }
    let resultSize: number
    if (size == "inherit") {
        resultSize = origin as number
    } else if (size?.startsWith("increase-")) {
        let offset = parseInt(size.replace("increase-", ""), 10)
        resultSize = origin + offset;
    } else if (size?.startsWith("decrease-")) {
        let offset = parseInt(size.replace("decrease-", ""), 10)
        resultSize = origin - offset;
    } else {
        resultSize = origin
    }
    return Math.max(0, Math.min(8, resultSize))
}

function contextSize(object: ElementNode | Listener | null): number {

    if (!object) return 2
    let elementNode = (typeof object == "function" ? object.elementNode : object) as ElementNode
    let node: ElementNode = elementNode;
    while (node && (!node.attributes || !node.attributes.get("dataSize"))) {
        node = node.parent as ElementNode
    }

    let size = 2

    if (node && node.attributes && node.attributes.has("dataSize")) {
        size = offsetSize(size, node.attributes.get("dataSize"))
        typeof object == "function" && node.attributes.onChange("dataSize", object)
    }
    return size
}


export function themeSize(object: ElementNode | Listener, size: ElementSize = "inherit"): string {
    let index = offsetSize(contextSize(object), size)
    return themeVars().fontSizes[index]
}