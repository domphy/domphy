import type { ElementNode, Listener } from "@domphy/core";
import { getTheme, themeName } from "./theme.js";

const ElementDensities = ["inherit"];

[...Array(5).keys()].forEach(i => {
    ElementDensities.push(`decrease-${i}`);
    ElementDensities.push(`increase-${i}`);
});

export type ElementDensity = typeof ElementDensities[number];

function offsetDensity(origin: number, density: ElementDensity = "inherit"): number {

    if (!ElementDensities.includes(density!)) {
        throw Error(`density name "${density}" invalid`);
    }
    let resultDensity: number;
    if (density == "inherit") {
        resultDensity = origin as number;
    } else if (density?.startsWith("increase-")) {
        let offset = parseInt(density.replace("increase-", ""), 10);
        resultDensity = origin + offset;
    } else if (density?.startsWith("decrease-")) {
        let offset = parseInt(density.replace("decrease-", ""), 10);
        resultDensity = origin - offset;
    } else {
        resultDensity = origin;
    }
    return Math.max(0, Math.min(4, resultDensity));
}

function contextDensity(object: ElementNode | Listener | null): number {

    if (!object) return 2;
    let elementNode = (typeof object == "function" ? object.elementNode : object) as ElementNode;
    let node: ElementNode = elementNode;
    while (node && (!node.attributes || !node.attributes.get("dataDensity"))) {
        node = node.parent as ElementNode;
    }

    let density = 2;

    if (node && node.attributes && node.attributes.has("dataDensity")) {
        density = offsetDensity(density, node.attributes.get("dataDensity"));
        typeof object == "function" && node.attributes.onChange("dataDensity", object);
    }
    return density;
}

export function themeDensity(object: ElementNode | Listener | null): number {
    let index = contextDensity(object);
    return getTheme(object ? themeName(object) : "light").densities[index];
}
