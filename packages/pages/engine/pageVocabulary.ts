/**
 * Pages lane vocabulary — the HARD whitelists an `element` node's `args` are
 * validated against (v33: an `element`/`text` NodeJSON tree — one arg per
 * attribute/event, plus tag/style/patches/children — see schema/model.ts's
 * module doc; the same closed-vocabulary reasoning survives from v31's now-
 * gone strict-slot shape — the author is an AI now, not a human, so a
 * closed vocabulary turns every typo into a validate-time error with a path
 * instead of a silent runtime miss). One list per concern; pageErrors
 * (pages.ts) enforces them and the builder/docs read them, so this file is
 * the single source of truth.
 *
 * Adding a name here is the ONLY way to widen the surface — there is no
 * escape hatch by design.
 */

/** Renderable HTML tags. No script/iframe/embed (a page is model data —
 *  it never gets to load foreign code), no canvas (needs imperative JS). */
export const PAGE_TAGS = [
    // structure
    "div", "span", "section", "article", "header", "footer", "nav", "main", "aside",
    // text
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "small", "strong", "em",
    "blockquote", "code", "pre", "mark", "sub", "sup",
    // lists
    "ul", "ol", "li", "dl", "dt", "dd",
    // interactive / form
    "a", "button", "label", "input", "select", "option", "optgroup",
    "textarea", "form", "fieldset", "legend", "progress", "meter",
    "details", "summary", "dialog",
    // media
    "img", "figure", "figcaption", "video", "audio", "source",
    // table
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    // misc
    "hr", "br",
] as const

/** Event slots (Domphy flat handler names). Values must be arrow
 *  expressions — see pages.ts's event law. */
export const PAGE_EVENTS = [
    "onClick", "onDblClick", "onInput", "onChange", "onSubmit",
    "onFocus", "onBlur", "onKeyDown", "onKeyUp",
    "onPointerDown", "onPointerUp", "onPointerMove",
    "onMouseEnter", "onMouseLeave", "onToggle",
] as const

/** Attribute names (HTML attribute spelling — Domphy sets them verbatim,
 *  `class` not `className`, `for` not `htmlFor`). */
export const PAGE_ATTRIBUTES = [
    // global
    "id", "class", "title", "role", "tabindex", "hidden", "lang", "dir",
    "aria-label", "aria-hidden", "aria-expanded", "aria-live",
    // links
    "href", "target", "rel", "download",
    // media
    "src", "alt", "width", "height", "loading", "poster",
    "controls", "loop", "muted", "autoplay", "preload",
    // form controls
    "type", "name", "value", "placeholder", "disabled", "checked",
    "selected", "required", "readonly", "multiple", "autocomplete",
    "min", "max", "step", "minlength", "maxlength", "pattern",
    "rows", "cols", "for", "spellcheck",
    // details/dialog
    "open",
    // table
    "colspan", "rowspan",
] as const

/** CSS properties (camelCase — Domphy style keys). Free-form VALUES, closed
 *  property SET. Nested rules ride selector keys instead (see
 *  PAGE_STYLE_SELECTOR below). */
export const PAGE_STYLE_PROPERTIES = [
    // layout / positioning
    "display", "position", "top", "right", "bottom", "left", "inset",
    "zIndex", "float", "clear", "visibility", "overflow", "overflowX",
    "overflowY", "boxSizing", "aspectRatio", "objectFit", "objectPosition",
    // flex / grid
    "flex", "flexDirection", "flexWrap", "flexFlow", "flexGrow",
    "flexShrink", "flexBasis", "order", "justifyContent", "justifyItems",
    "justifySelf", "alignContent", "alignItems", "alignSelf", "gap",
    "rowGap", "columnGap", "placeContent", "placeItems", "placeSelf",
    "grid", "gridArea", "gridAutoColumns", "gridAutoFlow", "gridAutoRows",
    "gridColumn", "gridRow", "gridTemplateAreas", "gridTemplateColumns",
    "gridTemplateRows",
    // box
    "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
    "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
    "marginBlock", "marginInline",
    "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "paddingBlock", "paddingInline",
    // border / outline
    "border", "borderTop", "borderRight", "borderBottom", "borderLeft",
    "borderWidth", "borderStyle", "borderColor", "borderRadius",
    "borderCollapse", "borderSpacing",
    "outline", "outlineWidth", "outlineStyle", "outlineColor", "outlineOffset",
    // background
    "background", "backgroundColor", "backgroundImage", "backgroundPosition",
    "backgroundRepeat", "backgroundSize", "backgroundClip",
    "backgroundAttachment",
    // typography
    "color", "font", "fontFamily", "fontSize", "fontStyle", "fontVariant",
    "fontWeight", "lineHeight", "letterSpacing", "textAlign",
    "textDecoration", "textIndent", "textOverflow", "textShadow",
    "textTransform", "textWrap", "whiteSpace", "wordBreak", "wordSpacing",
    "verticalAlign", "direction",
    // lists
    "listStyle", "listStylePosition", "listStyleType",
    // effects / interaction
    "boxShadow", "opacity", "filter", "backdropFilter", "mixBlendMode",
    "clipPath", "cursor", "pointerEvents", "userSelect", "resize",
    "caretColor", "accentColor", "willChange", "content",
    // transform / motion
    "transform", "transformOrigin", "translate", "rotate", "scale",
    "transition", "transitionDelay", "transitionDuration",
    "transitionProperty", "transitionTimingFunction",
    "animation", "animationDelay", "animationDirection", "animationDuration",
    "animationFillMode", "animationIterationCount", "animationName",
    "animationPlayState", "animationTimingFunction",
    "scrollBehavior",
] as const

/** A nested style key: a Domphy CSS-in-JS selector. `&`-prefixed composes
 *  onto the element's own selector (`&:hover`); `@media`/`@keyframes` open
 *  an at-rule block. Anything else is NOT allowed nested (a bare descendant
 *  selector is an escape hatch — use another element instead). */
export const PAGE_STYLE_SELECTOR = /^(&|@media\b|@keyframes\b)/

/** A @keyframes step key: `from` | `to` | `50%`. */
export const PAGE_KEYFRAME_STEP = /^(from|to|\d{1,3}%)$/

/** Patch names an element's `patches` slot may carry (v32 — supersedes the
 *  10-name Domphy-component whitelist: `patches` is now a keyed OBJECT of
 *  structured options per patch, not an expression string, so this list is
 *  only needed to filter a DYNAMICALLY generated subtree (a children
 *  expression's output bypasses zod's `.strict()` — see pages.ts's
 *  adoptResolved-equivalent) the same way PAGE_TAG_SET filters a bad tag. */
export const PAGE_PATCHES = ["popover"] as const
export const PAGE_PATCH_SET: ReadonlySet<string> = new Set(PAGE_PATCHES)

/** floating-ui/dom `Placement` values — verbatim from its own type union. */
export const PAGE_POPOVER_PLACEMENTS = [
    "top", "top-start", "top-end",
    "right", "right-start", "right-end",
    "bottom", "bottom-start", "bottom-end",
    "left", "left-start", "left-end",
] as const

export const PAGE_TAG_SET: ReadonlySet<string> = new Set(PAGE_TAGS)
export const PAGE_EVENT_SET: ReadonlySet<string> = new Set(PAGE_EVENTS)
export const PAGE_ATTRIBUTE_SET: ReadonlySet<string> = new Set(PAGE_ATTRIBUTES)
export const PAGE_STYLE_PROPERTY_SET: ReadonlySet<string> = new Set(PAGE_STYLE_PROPERTIES)
