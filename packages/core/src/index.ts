export * from "./classes/AttributeList.js";
export * from "./classes/ElementList.js";
export * from "./classes/ElementNode.js";
export * from "./classes/Notifier.js";
export * from "./classes/RawHTML.js";
export * from "./classes/Reactive.js";
export * from "./classes/RecordState.js";
export * from "./classes/State.js";
export * from "./classes/TextNode.js";
// The root-only base rule ElementNode.generateCSS() prepends and helpers.ts's
// ensureDomStyle() inserts on the client (see ElementNode.ts's generateCSS docs
// for why it must be !important). Exported so tooling that lints generated CSS
// (@domphy/doctor's Layer 4) can exempt this exact rule by reference instead of
// carrying its own byte-copy of a string this package owns.
export const HIDDEN_DISPLAY_NONE_CSS =
  "[hidden] { display: none !important; } ";
export { configure, getConfig } from "./config.js";
export * from "./constants.js";
export {
  isCustomElementName,
  // The one place `$` composition order is defined (patches expanded, composed
  // left to right, the element's own keys last). Exported so tooling that has
  // to see a fully-composed element — @domphy/doctor analysing a tree before it
  // is ever constructed — reads the real policy instead of restating it.
  mergePartial,
  sanitizeHTMLString,
} from "./helpers.js";
export * from "./types.js";
export * from "./utils.js";
