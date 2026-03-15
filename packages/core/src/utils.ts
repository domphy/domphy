import { DomphyElement, HookMap, EventName, Handler } from "./types.js";
import { State } from "./classes/State.js"
import { ListState } from "./classes/ListState.js"

import { deepClone, addEvent, addHook } from "./helpers.js"

export function merge(source: Record<string, any> = {}, target: Record<string, any> = {}): Record<string, any> {
    const comma = ["animation", "transition", "boxShadow", "textShadow", "background", "fontFamily"]
    const space = ["class", "rel", "transform", "acceptCharset", "sandbox"]
    const adjacent = ["content"]
    if (Object.prototype.toString.call(target) === "[object Object]" && Object.getPrototypeOf(target) === Object.prototype) { // plainjs not class instance
        target = deepClone(target)
    }

    for (const key in target) {

        const value = target[key];
        if (value === undefined || value === null || value === "") continue;

        if (typeof value === "object" && !Array.isArray(value)) {
            if (typeof source[key] === "object") {
                source[key] = merge(source[key], value);
            } else {
                source[key] = value;
            }

        } else {
            if (comma.includes(key)) {
                if (typeof source[key] === "function" || typeof value === "function") {
                    let old = source[key]
                    source[key] = (listener: Handler) => {
                        let val1 = typeof old === "function" ? old(listener) : old
                        let val2 = typeof value === "function" ? value(listener) : value
                        return [val1, val2].filter(e => e).join(", ")
                    }
                } else {
                    source[key] = [source[key], value].filter(e => e).join(", ")
                }

            } else if (adjacent.includes(key)) {
                if (typeof source[key] === "function" || typeof value === "function") {
                    let old = source[key]
                    source[key] = (listener: Handler) => {
                        let val1 = typeof old === "function" ? old(listener) : old
                        let val2 = typeof value === "function" ? value(listener) : value
                        return [val1, val2].filter(e => e).join("")
                    }
                } else {
                    source[key] = [source[key], value].filter(e => e).join("")
                }
            } else if (space.includes(key)) {
                if (typeof source[key] === "function" || typeof value === "function") {
                    let old = source[key]
                    source[key] = (listener: Handler) => {
                        let val1 = typeof old === "function" ? old(listener) : old
                        let val2 = typeof value === "function" ? value(listener) : value
                        return [val1, val2].filter(e => e).join(" ")
                    }
                } else {
                    source[key] = [source[key], value].filter(e => e).join(" ")
                }
            } else if (key.startsWith("on")) {
                let name = key.replace("on", "").toLowerCase() as EventName
                addEvent(source as DomphyElement, name, value)
            } else if (key.startsWith("_on")) {
                let name = key.replace("_on", "") as keyof HookMap
                addHook(source as DomphyElement, name, value)
            } else {
                source[key] = value;
            }
        }
    }
    return source;
}

export function hashString(str: string = ""): string {
    let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // FNV prime, keep 32-bit unsigned
    }
    return String.fromCharCode(97 + (hash % 26)) + hash.toString(16);
}

export function toState<T>(val: T | State<T>): State<T> {
    return val instanceof State ? val : new State<T>(val);
}

export function toListState<T>(val: T[] | ListState<T>): ListState<T> {
    return val instanceof ListState ? val : new ListState<T>(val);
}
