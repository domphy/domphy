import { DomphyElement, PartialElement, HookMap, EventName, Handler, TagName } from "./types.js";
import { ElementNode } from "./classes/ElementNode.js"
import { State } from "./classes/State.js"
import { eventNameMap } from "./types/EventProperties.js"
import { HtmlTags } from "./constants/HtmlTags.js"
import {merge} from "./utils.js"

export function addHook<K extends keyof HookMap>(partial: PartialElement, hookName: K, handler: HookMap[K]): void {
    const hookProperty = `_on${hookName}` as keyof PartialElement;
    let current = partial[hookProperty];

    if (typeof current === "function") {
        (partial as any)[hookProperty] = (...args: any[]) => {
            (current as Function)(...args);
            (handler as Function)(...args);
        };
    } else {
        (partial as any)[hookProperty] = handler;
    }
}

export function addEvent<K extends keyof HTMLElementEventMap>(
    attributes: PartialElement,
    eventName: K,
    handler: (event: HTMLElementEventMap[K], node: ElementNode) => void
): void {
    const eventProperty = eventNameMap[eventName];
    if (!eventProperty) {
        throw Error(`invalid event name "${eventName}"`);
    }
    const current = (attributes as any)[eventProperty]

    if (typeof current == "function") {
        (attributes as any)[eventProperty] = (event: HTMLElementEventMap[K], node: ElementNode) => {
            current(event, node)
            handler(event, node);
        };
    } else {
        (attributes as any)[eventProperty] = handler
    }
}

export function deepClone(value: any, seen = new WeakMap()): any {
    if (value === null || typeof value !== "object") return value;
    if (typeof value === "function") return value;
    if (seen.has(value)) return seen.get(value);

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && !Array.isArray(value)) return value; // ignore class instance

    let clone: any;

    if (Array.isArray(value)) {
        clone = [];
        seen.set(value, clone);
        for (const v of value) clone.push(deepClone(v, seen));
        return clone;
    }

    if (value instanceof Date) return new Date(value);
    if (value instanceof RegExp) return new RegExp(value);
    if (value instanceof Map) {
        clone = new Map();
        seen.set(value, clone);
        for (const [k, v] of value) clone.set(deepClone(k, seen), deepClone(v, seen));
        return clone;
    }
    if (value instanceof Set) {
        clone = new Set();
        seen.set(value, clone);
        for (const v of value) clone.add(deepClone(v, seen));
        return clone;
    }
    if (ArrayBuffer.isView(value)) {
        return new (value as any).constructor(value);
    }
    if (value instanceof ArrayBuffer) {
        return value.slice(0);
    }

    clone = Object.create(proto);
    seen.set(value, clone);

    for (const key of Reflect.ownKeys(value)) {
        clone[key] = deepClone(value[key], seen);
    }

    return clone;
}

export function validate(element: DomphyElement | PartialElement, asPartial = false): boolean {
    if (Object.prototype.toString.call(element) !== "[object Object]") {
        throw Error(`typeof ${element} is invalid DomphyElement`);
    }
    let keys = Object.keys(element);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let val = element[key as keyof typeof element]
        if (i == 0 && !HtmlTags.includes(key) && !key.includes("-") && !asPartial) { // web-component
            throw Error(`key ${key} is not valid HTML tag name`);
        } else if (key == "style" && val && Object.prototype.toString.call(val) !== "[object Object]") {
            throw Error(`"style" must be a object`);
        } else if (key == "$") {
            element.$!.forEach(v => validate(v as PartialElement, true))
        } else if (key.startsWith("_on") && typeof val != "function") {
            throw Error(`hook ${key} value "${val}" must be a function `)
        } else if (key.startsWith("on") && typeof val != "function") {
            throw Error(`event ${key} value "${val}" must be a function `);
        } else if (key == "_portal" && typeof val !== "function") {
            throw Error(`"_portal" must be a function return HTMLElement`);
        } else if (key == "_context" && Object.prototype.toString.call(val) !== "[object Object]") {
            throw Error(`"_context" must be a object`);
        } else if (key == "_metadata" && Object.prototype.toString.call(val) !== "[object Object]") {
            throw Error(`"_metadata" must be a object`);
        } else if (key == "_key" && (typeof val !== "string" && typeof val !== "number")) {
            throw Error(`"_key" must be a string or number`);
        }
    }
    return true;
}

export function isValid(element: DomphyElement): boolean {

    if (Array.isArray(element)) return false;
    if (!element || typeof element !== "object") return false;

    let keys = Object.keys(element);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let val = element[key as keyof typeof element];
        if (i == 0 && !HtmlTags.includes(key)) return false
        if (key === "style" && (val == null || typeof val !== "object" || Array.isArray(val))) return false;
        if (key.startsWith("_on") && typeof val !== "function") return false;
        if (key.startsWith("on") && typeof val !== "function") return false;
        if (key === "_portalChildren" && !Array.isArray(val)) return false;
        if ((key === "_context" || key === "_metadata") && (val == null || typeof val !== "object" || Array.isArray(val))) return false;
    }
    return true;
}

export function isHTML(str: string): boolean {
    return /<([a-z][\w-]*)(\s[^>]*)?>.*<\/\1>|<([a-z][\w-]*)(\s[^>]*)?\/>/i.test(str.trim());
}

export function escapeHTML(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function addClass(element: PartialElement, className: string): void {

    if (typeof element.class == "function") {
        let reactive = element.class
        element.class = (listener) => String(reactive(listener)) + " " + className
    } else {
        let current = element.class || ""
        let split = String(current).split(" ")
        split.push(className)
        element.class = split.filter(e => e).join(" ")
    }

}

export function removeClass(element: PartialElement, className: string): void {

    if (typeof element.class == "function") {
        let reactive = element.class
        element.class = (listener) => {
            let split = String(reactive(listener)).split(" ")
            return split.filter(e => e != className).join(" ")
        }
    } else {
        let split = String(element.class).split(" ")
        element.class ||= ""
        element.class = split.filter(e => e != className).join(" ")
    }

}

export function toggleClass(element: PartialElement, className: string): void {

    if (typeof element.class == "function") {
        let reactive = element.class
        element.class = (listener) => {
            let split = String(reactive(listener)).split(" ")
            return split.includes(className) ? split.filter(e => e != className).join(" ") : split.concat([className]).join(" ")
        }
    } else {
        let split = String(element.class).split(" ")
        element.class ||= ""
        element.class = split.includes(className) ? split.filter(e => e != className).join(" ") : split.concat([className]).join(" ")
    }

}

export function getTagName(element: DomphyElement): TagName | undefined {
    return Object.keys(element).find(e => HtmlTags.includes(e)) as TagName | undefined
}


export function camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function selectorSplitter(selectors: string) {
    if (selectors.indexOf('@') === 0) {
        return [selectors];
    }
    var splitted = [];
    var parens = 0;
    var angulars = 0;
    var soFar = '';
    for (var i = 0, len = selectors.length; i < len; i++) {
        var char = selectors[i];
        if (char === '(') {
            parens += 1;
        } else if (char === ')') {
            parens -= 1;
        } else if (char === '[') {
            angulars += 1;
        } else if (char === ']') {
            angulars -= 1;
        } else if (char === ',') {
            if (!parens && !angulars) {
                splitted.push(soFar.trim());
                soFar = '';
                continue;
            }
        }
        soFar += char;
    }
    splitted.push(soFar.trim());
    return splitted;
};

export const mergePartial = (partial: PartialElement | DomphyElement): typeof partial => {

    if (Array.isArray(partial.$)) {
        let part: typeof partial = {}
        partial.$.forEach(p => merge(part, mergePartial(p)))
        delete partial.$
        merge(part, partial) // native win

        return part
    } else {
        return partial
    }
}