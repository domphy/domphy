// Shared catalog of every @domphy/ui patch export: its documented host tag, the
// minimum props it needs to build, and the default content that host requires.
// Used by the doctor-conformance gate and the WCAG contrast sweep.

/** Host tags for every patch (from @hostTag JSDoc / layout defaults). */
export const HOST: Record<string, string> = {
  abbreviation: "abbr",
  accordion: "div",
  alert: "div",
  avatar: "span",
  badge: "span",
  blockquote: "blockquote",
  breadcrumb: "nav",
  breadcrumbEllipsis: "button",
  button: "button",
  buttonGhost: "button",
  buttonSwitch: "button",
  card: "div",
  code: "code",
  combobox: "div",
  command: "input",
  commandItem: "div",
  commandSearch: "input",
  datePicker: "input",
  descriptionList: "dl",
  details: "details",
  dialog: "dialog",
  divider: "div",
  drawer: "dialog",
  emphasis: "em",
  empty: "div",
  errorBoundary: "div",
  fab: "button",
  figure: "figure",
  formGroup: "fieldset",
  grid: "div",
  heading: "h2",
  horizontalRule: "hr",
  icon: "span",
  image: "img",
  inputCheckbox: "input",
  inputColor: "input",
  inputDateTime: "input",
  inputFile: "input",
  inputNumber: "input",
  inputOTP: "div",
  inputPassword: "div",
  inputRadio: "input",
  inputRange: "input",
  inputSearch: "input",
  inputSwitch: "input",
  inputText: "input",
  keyboard: "kbd",
  label: "label",
  link: "a",
  linkButton: "a",
  list: "ul",
  listItem: "li",
  listItemButton: "button",
  mark: "mark",
  menu: "div",
  motion: "div",
  orderedList: "ol",
  pagination: "div",
  panelSection: "div",
  paragraph: "p",
  popover: "button",
  popoverArrow: "div",
  preformated: "pre",
  progress: "progress",
  rating: "div",
  ringProgress: "div",
  row: "div",
  scrollArea: "div",
  segmented: "div",
  select: "select",
  selectBox: "div",
  selectItem: "div",
  selectList: "div",
  skeleton: "div",
  small: "small",
  spinner: "span",
  splitter: "div",
  splitterHandle: "div",
  splitterPanel: "div",
  stack: "div",
  steps: "div",
  strong: "strong",
  subscript: "sub",
  superscript: "sup",
  table: "table",
  tabs: "div",
  tag: "span",
  textarea: "textarea",
  timeline: "div",
  timelineItem: "div",
  toast: "div",
  toggleGroup: "div",
  toolbar: "div",
  toolbarSpacer: "div",
  tooltip: "button",
  transitionGroup: "div",
  unorderedList: "ul",
  visuallyHidden: "span",
};

// Function exports that are NOT patch factories (shared style helpers) —
// excluded from the every-export-is-a-patch gate below.
export const UTILITY_EXPORTS = new Set(["focusRing", "elevation"]);

export const PATCH_ARGS: Record<string, unknown> = {
  command: { items: [{ value: "a", label: "A" }] },
  // `content` is a REQUIRED prop on both: omitting it made createFloating stamp
  // an undefined panel descriptor, so the patch threw at MOUNT (swallowed as
  // "[Domphy] Unhandled error in reactive child") and its dropdown CSS never
  // reached the contrast sweep.
  combobox: {
    options: [{ value: "a", label: "A" }],
    content: { div: "panel" },
  },
  selectBox: {
    options: [{ value: "a", label: "A" }],
    content: { div: "panel" },
  },
  datePicker: {},
  menu: { items: [{ label: "Item" }] },
  selectList: { options: [{ value: "a", label: "A" }] },
  segmented: { items: [{ label: "A", key: "a" }] },
  tabs: { items: [{ key: "a", label: "A", content: { div: "A" } }] },
  toggleGroup: { items: [{ label: "A", key: "a" }] },
  steps: { items: [{ label: "One" }, { label: "Two" }] },
  timeline: { items: [{ title: "A", content: "B" }] },
  accordion: { items: [{ title: "A", content: { p: "body" } }] },
  pagination: { page: 1, total: 10 },
  rating: { value: 3 },
  ringProgress: { value: 50 },
  progress: { value: 40 },
  list: { items: ["a", "b"] },
  orderedList: { items: ["a", "b"] },
  unorderedList: { items: ["a", "b"] },
  breadcrumb: {
    items: [{ label: "Home", href: "/" }, { label: "Page" }],
  },
  toast: { message: "Hi" },
  popover: { content: { div: "panel" } },
  tooltip: { content: "tip" },
  motion: { animate: { opacity: 1 } },
  empty: { title: "Empty" },
  alert: { title: "Note" },
  image: {},
  inputOTP: { length: 4 },
  descriptionList: { items: [{ term: "A", description: "B" }] },
  commandItem: { value: "a", label: "A" },
  commandSearch: {},
  listItem: {},
  listItemButton: {},
  timelineItem: { title: "A" },
};

export const VOID = new Set(["hr", "img", "input", "progress"]);

export function defaultContent(tag: string): unknown {
  if (VOID.has(tag)) return null;
  if (tag === "select") return [{ option: "A", value: "a" }];
  if (tag === "ul" || tag === "ol") return [{ li: "item" }];
  if (tag === "table") return [{ tbody: [{ tr: [{ td: "cell" }] }] }];
  if (tag === "dialog") return [{ p: "body" }];
  if (tag === "details") return [{ summary: "sum" }, { p: "body" }];
  if (tag === "dl") return [{ dt: "t" }, { dd: "d" }];
  if (tag === "figure")
    return [{ img: null, src: "x.png", alt: "" }, { figcaption: "c" }];
  if (tag === "fieldset") return [{ legend: "L" }, { p: "body" }];
  if (tag === "a") return "link";
  if (tag === "label") return "Label";
  if (tag === "textarea") return "text";
  if (tag === "li") return "item";
  return "content";
}
