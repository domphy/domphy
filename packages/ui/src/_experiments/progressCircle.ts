
import { type DomphyElement, type PartialElement, toState, type ValueOrState } from '@domphy/core'
import { themeSpacing, themeColor, themeSize ,ThemeColor} from "@domphy/ui"

/**
 * @experiment
 * @status failed
 * @reason Remark 1 — width constraint conflicts with typography
 * @evidence "100" does not fit 8U×8U even without %
 * @paper Section X: Empirical Completeness — counter-example
 * @ref Ant Design provides this at arbitrary sizes — no theory basis
 */

function circle(props: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
    percent?: ValueOrState<number>;
} = {}): DomphyElement<"div"> {

    const { color = "neutral", accentColor = "primary", percent = 50 } = props;
    const state = toState(percent);

    const r    = 4                     // 4U
    const sw   = 1                     // 1U
    const cx   = r + sw / 2            // 4.5U
    const vb   = cx * 2                // 9U
    const circ = 2 * Math.PI * r

    const track: DomphyElement<"circle"> = {
        circle: null,
        cx: String(cx),
        cy: String(cx),
        r: String(r),
        fill: "none",
        strokeWidth: String(sw),
        style: {
            stroke: (l) => themeColor(l, "shift-4", color),
        }
    }

    const indicator: DomphyElement<"circle"> = {
        circle: null,
        cx: String(cx),
        cy: String(cx),
        r: String(r),
        fill: "none",
        strokeWidth: String(sw),
        strokeLinecap: "round",
        strokeDasharray: String(circ),
        strokeDashoffset: (l) => String(circ * (1 - state.get(l) / 100)),
        style: {
            stroke: (l) => themeColor(l, "shift-6", accentColor),
        }
    }

    return {
        div: [
            {
                svg: [track, indicator],
                xmlns:"http://www.w3.org/2000/svg",
                viewBox: `0 0 ${vb} ${vb}`,
                style: {
                    width: "100%",
                    height: "100%",
                    display: "block",
                    transform: "rotate(-90deg)",
                }
            }
        ],
        style: {
            position: "absolute",
            inset: 0,
        }
    }
}


const patch = (props: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
    percent?: ValueOrState<number>;
} = {}):PartialElement=>{
 
    return {
        role: "progressbar",
        ariaValuemin: 0,
        ariaValuemax: 100,
        ariaValuenow: (l) => Math.round(toState(props.percent ?? 50).get(l)),
        style: {
          display:'flex',
          alignItems:"center",
          justifyContent:"center",
            position: "relative",
            width: themeSpacing(8),
            height: themeSpacing(8),
          "& > :first-child":{
            fontSize:(listener)=>themeSize(listener,"decrease-1")
          }
        },
        _onInsert: (node) => node.children.insert(circle(props))
    }
}

const percent = toState(50)
const App: DomphyElement<"div"> = {
    div: (listener) => percent.get(listener) + "%",
    $: [patch({ percent })]

}
export default App
