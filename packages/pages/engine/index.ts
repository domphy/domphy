/**
 * Local engine surface for @domphy/pages. Replaces the @parashape/parametric
 * import (that package is not in this workspace). Vocabulary is the
 * snapshot in pageVocabulary.ts; parse/evaluate/event-law live here.
 */
export type {
    ContainerJSON,
    Expression,
    NodeJSON,
    OperationJSON,
    PageArgJSON,
    PageJSON,
    PageScope,
    ResolvedPagePopover,
} from "./types.js"
export { evaluate, parse } from "./expression.js"
export {
    createTableNamespace,
    encodeBase64,
    type EventOutcome,
    interpretEventResult,
    isContainerJSON,
    type PageEffect,
    resolvePageParameters,
    StatsNamespace,
} from "./runtime.js"
export { Model, ParameterNode } from "./model.js"
export {
    PAGE_ATTRIBUTE_SET,
    PAGE_ATTRIBUTES,
    PAGE_EVENT_SET,
    PAGE_EVENTS,
    PAGE_KEYFRAME_STEP,
    PAGE_PATCH_SET,
    PAGE_PATCHES,
    PAGE_POPOVER_PLACEMENTS,
    PAGE_STYLE_PROPERTIES,
    PAGE_STYLE_PROPERTY_SET,
    PAGE_STYLE_SELECTOR,
    PAGE_TAG_SET,
    PAGE_TAGS,
} from "./pageVocabulary.js"
