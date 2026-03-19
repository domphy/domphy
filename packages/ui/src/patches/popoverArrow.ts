import { toState, ValueOrState, PartialElement } from "@domphy/core";
import { themeSpacing, themeColor, themeSize, type ThemeColor } from "@domphy/theme";
import { Placement } from "@floating-ui/dom";

function popoverArrow(props: {
    placement?: ValueOrState<Placement>;
    sideOffset?: string;
    color?: ThemeColor;
    bordered?: boolean;

} = {}): PartialElement {
    let {
        placement = "bottom-end",
        color = "neutral",
        sideOffset = themeSpacing(6),
        bordered = true
    } = props
    let place = toState(placement)

    const flipMap: Record<Placement, Placement> = {
        "top": "bottom",
        "bottom": "top",
        "left": "right",
        "right": "left",
        "top-start": "bottom-end",
        "top-end": "bottom-start",
        "bottom-start": "top-end",
        "bottom-end": "top-start",
        "left-start": "right-end",
        "left-end": "right-start",
        "right-start": "left-end",
        "right-end": "left-start",
    }
    const flipPlace = toState(flipMap[place.get()])
    place.addListener(val => flipPlace.set(flipMap[val as Placement]))

    const start = (pos: string) => pos.includes("start") ? sideOffset : pos.includes("end") ? "auto" : "50%"
    const end = (pos: string) => pos.includes("end") ? sideOffset : pos.includes("start") ? "auto" : "50%"

    return {
        style: {
            fontSize: (listener) => themeSize(listener),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color),
            position: "relative",
            "&::after": {
                content: `""`,
                position: "absolute",
                width: themeSpacing(1.5),
                height: themeSpacing(1.5),
                backgroundColor: (listener) => themeColor(listener, "inherit", color),
                borderWidth:bordered ? "0px" :"1px",
                borderColor: (listener) => themeColor(listener, "inherit", color),
                borderTopStyle: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("top") || pos.includes("right") ? `solid` : "none"
                },
                borderBottomStyle: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("bottom") || pos.includes("left") ? `solid` : "none"
                },
                borderLeftStyle: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("top") || pos.includes("left") ? `solid` : "none"
                },
                borderRightStyle: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("bottom") || pos.includes("right") ? `solid` : "none"
                },
                top: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("top") ? 0 : pos.includes("bottom") ? "auto" : start(pos)
                },
                right: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("right") ? 0 : pos.includes("left") ? "auto" : end(pos)
                },
                bottom: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("bottom") ? 0 : pos.includes("top") ? "auto" : end(pos)
                },
                left: (listener) => {
                    const pos = flipPlace.get(listener)
                    return pos.includes("left") ? 0 : pos.includes("right") ? "auto" : start(pos)
                },
                transform: (listener) => {
                    const pos = flipPlace.get(listener)
                    const x = pos.includes("right") || (pos.includes("end") && !pos.includes("left")) ? "50%" : "-50%"
                    const y = pos.includes("bottom") || (pos.includes("end") && !pos.includes("top")) ? "50%" : "-50%"
                    return `translate(${x},${y}) rotate(45deg)`
                },
            }
        }
    }
}

export { popoverArrow }