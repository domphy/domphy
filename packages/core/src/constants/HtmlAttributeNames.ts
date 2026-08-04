// Multi-word HTML/global attribute names whose real DOM content-attribute
// spelling is either a plain lowercase concatenation (no hyphen at all, e.g.
// autoFocus -> autofocus, tabIndex -> tabindex) or an outright rename
// (htmlFor -> for). The generic camelToKebab() helper only knows how to
// insert a hyphen before every capital letter, so it cannot produce these —
// it is only correct for the small set of HTML attributes whose real name IS
// genuinely hyphenated (http-equiv, accept-charset), for data-*, and for the
// SINGLE-hump aria-* attributes (ariaExpanded -> aria-expanded). Multi-hump
// aria-* names (ariaActiveDescendant) are NOT hyphenated per hump in the ARIA
// spec (aria-activedescendant), so they must be listed here explicitly.
//
// ElementAttribute's constructor checks this map before falling back to
// camelToKebab(), so any camelCase key NOT listed here (including custom
// attributes such as web-component props, e.g. myWidgetProp) still gets the
// previous kebab-case treatment unchanged.
export const HtmlAttributeNames: Record<string, string> = {
  // Rename, not just a case change.
  htmlFor: "for",

  // Boolean HTML attributes (BooleanAttributes.ts) with camelCase humps.
  allowFullScreen: "allowfullscreen",
  autoFocus: "autofocus",
  autoPlay: "autoplay",
  formNoValidate: "formnovalidate",
  isMap: "ismap",
  itemScope: "itemscope",
  noHref: "nohref",
  noShade: "noshade",
  noValidate: "novalidate",
  playsInline: "playsinline",
  trueSpeed: "truespeed",
  typeMustMatch: "typemustmatch",
  noModule: "nomodule",
  autoPictureInPicture: "autopictureinpicture",

  // Enumerated (yes/no, on/off, true/false) attributes — see
  // EnumeratedBooleanAttributes in classes/ElementAttribute.ts.
  autoCapitalize: "autocapitalize",
  contentEditable: "contenteditable",
  spellCheck: "spellcheck",

  // Multi-hump aria-* attributes — the ARIA spec hyphenates only after
  // "aria", so camelToKebab() would emit a bogus second hyphen
  // (ariaActiveDescendant -> aria-active-descendant, never recognized by
  // assistive technology). These are the only multi-hump names in the typed
  // GlobalAttributes list (types/GlobalAttributes.ts).
  ariaActiveDescendant: "aria-activedescendant",
  ariaColCount: "aria-colcount",
  ariaPosinSet: "aria-posinset",
  ariaSetSize: "aria-setsize",

  // Other global attributes.
  accessKey: "accesskey",
  enterKeyHint: "enterkeyhint",
  inputMode: "inputmode",
  itemId: "itemid",
  itemProp: "itemprop",
  itemRef: "itemref",
  itemType: "itemtype",
  tabIndex: "tabindex",
  writingSuggestions: "writingsuggestions",

  // Common non-boolean multi-word HTML attributes.
  charSet: "charset",
  hrefLang: "hreflang",
  crossOrigin: "crossorigin",
  aLink: "alink",
  bgColor: "bgcolor",
  vLink: "vlink",
  formAction: "formaction",
  formEncType: "formenctype",
  formMethod: "formmethod",
  formTarget: "formtarget",
  popoverTarget: "popovertarget",
  popoverTargetAction: "popovertargetaction",
  allowPaymentRequest: "allowpaymentrequest",
  allowUserMedia: "allowusermedia",
  frameBorder: "frameborder",
  longDesc: "longdesc",
  marginHeight: "marginheight",
  marginWidth: "marginwidth",
  referrerPolicy: "referrerpolicy",
  srcDoc: "srcdoc",
  hSpace: "hspace",
  fetchPriority: "fetchpriority",
  srcSet: "srcset",
  srcLang: "srclang",
  useMap: "usemap",
  vSpace: "vspace",
  dirName: "dirname",
  imageSizes: "imagesizes",
  imageSrcSet: "imagesrcset",
  classId: "classid",
  codeBase: "codebase",
  codeType: "codetype",
  valueType: "valuetype",
  shadowRootClonable: "shadowrootclonable",
  shadowRootDelegatesFocus: "shadowrootdelegatesfocus",
  shadowRootMode: "shadowrootmode",
  colSpan: "colspan",
  rowSpan: "rowspan",
  noWrap: "nowrap",
  vAlign: "valign",
  charOff: "charoff",
  maxLength: "maxlength",
  minLength: "minlength",
  autoComplete: "autocomplete",
  encType: "enctype",
  dateTime: "datetime",
};
