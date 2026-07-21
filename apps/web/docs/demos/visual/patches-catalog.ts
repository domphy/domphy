import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import {
  abbreviation,
  accordion,
  alert,
  avatar,
  badge,
  blockquote,
  breadcrumb,
  breadcrumbEllipsis,
  button,
  buttonGhost,
  buttonSwitch,
  card,
  code,
  combobox,
  command,
  commandItem,
  commandSearch,
  datePicker,
  descriptionList,
  details,
  dialog,
  divider,
  drawer,
  emphasis,
  empty,
  fab,
  figure,
  formGroup,
  heading,
  horizontalRule,
  icon,
  image,
  inputCheckbox,
  inputColor,
  inputDateTime,
  inputFile,
  inputNumber,
  inputOTP,
  inputPassword,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  keyboard,
  label,
  link,
  linkButton,
  list,
  listItem,
  listItemButton,
  mark,
  menu,
  motion,
  orderedList,
  pagination,
  panelSection,
  paragraph,
  popover,
  popoverArrow,
  preformated,
  progress,
  rating,
  ringProgress,
  row,
  scrollArea,
  segmented,
  select,
  selectBox,
  selectItem,
  selectList,
  skeleton,
  small,
  spinner,
  splitter,
  splitterHandle,
  splitterPanel,
  stack,
  steps,
  strong,
  subscript,
  superscript,
  table,
  tabs,
  tag,
  textarea,
  timeline,
  timelineItem,
  toast,
  toggleGroup,
  toolbar,
  toolbarSpacer,
  tooltip,
  transitionGroup,
  unorderedList,
} from "@domphy/ui";
import { visualCell, visualPage, visualSection } from "./cell.js";

// ── shared fixtures ─────────────────────────────────────────────────────────

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a7 7 0 0 1 5.292 11.584A5.002 5.002 0 0 1 14 17.9V19a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.1a5.002 5.002 0 0 1-3.292-4.316A7 7 0 0 1 12 2z"/></svg>';

const CHART_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" rx="12" fill="#4f7cff"/><polyline points="30,140 80,100 130,120 180,70 230,90 280,40" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>`,
)}`;

const fruitOptions = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Cherry", value: "cherry" },
];

const selectOpts = (placeholder = "Pick one") => [
  { option: placeholder, value: "", selected: true, disabled: true },
  ...fruitOptions.map((f) => ({ option: f.label, value: f.value })),
];

const box = (label: string): DomphyElement<"div"> => ({
  div: label,
  style: {
    padding: themeSpacing(2),
    borderRadius: themeSpacing(1),
    backgroundColor: (l) => themeColor(l, "shift-3"),
    color: (l) => themeColor(l, "text"),
    minWidth: themeSpacing(12),
    textAlign: "center",
  },
});

// Controlled open states for overlays (force-open for screenshots)
const dialogOpen = toState(true);
const drawerOpen = toState(true);
const popoverOpen = toState(true);
const tooltipOpen = toState(true);
const selectBoxOpen = toState(true);
const comboboxOpen = toState(true);
const selectValue = toState<string | null>("cherry");
const comboboxValue = toState<string | null>("apple");
const pageState = toState(2);
const ratingState = toState(3);
const stepState = toState(1);
const switchOn = toState(true);
const motionList = toState([1, 2, 3]);
const ringValue = toState(65);

const selectDropdown: DomphyElement<"div"> = {
  div: fruitOptions.map((f) => ({
    div: f.label,
    $: [selectItem({ value: f.value })],
  })),
  $: [selectList({ value: selectValue })],
};

const comboboxDropdown: DomphyElement<"div"> = {
  div: fruitOptions.map((f) => ({
    div: f.label,
    $: [selectItem({ value: f.value })],
  })),
  $: [selectList({ value: comboboxValue })],
};

const popoverContent: DomphyElement<"div"> = {
  div: "Popover body",
  dataTone: "shift-17",
  style: {
    padding: themeSpacing(3),
    borderRadius: themeSpacing(2),
    backgroundColor: (l) => themeColor(l, "inherit"),
    color: (l) => themeColor(l, "text"),
  },
  $: [popoverArrow({ placement: "bottom" })],
};

// ── sections ────────────────────────────────────────────────────────────────

const buttons = visualSection("Buttons", [
  visualCell("button-default", "button / default", {
    button: "Default",
    $: [button()],
  }),
  visualCell("button-variant-solid", "button / solid", {
    button: "Solid",
    $: [button({ variant: "solid", color: "primary" })],
  }),
  visualCell("button-variant-outline", "button / outline", {
    button: "Outline",
    $: [button({ variant: "outline", color: "primary" })],
  }),
  visualCell("button-variant-ghost", "button / ghost", {
    button: "Ghost",
    $: [button({ variant: "ghost", color: "primary" })],
  }),
  visualCell("button-color-primary", "button / primary", {
    button: "Primary",
    $: [button({ color: "primary" })],
  }),
  visualCell("button-color-danger", "button / danger", {
    button: "Danger",
    $: [button({ color: "danger" })],
  }),
  visualCell("button-color-success", "button / success", {
    button: "Success",
    $: [button({ color: "success" })],
  }),
  visualCell("button-size-small", "button / small", {
    button: "Small",
    $: [button({ color: "primary", size: "small" })],
  }),
  visualCell("button-size-medium", "button / medium", {
    button: "Medium",
    $: [button({ color: "primary", size: "medium" })],
  }),
  visualCell("button-size-large", "button / large", {
    button: "Large",
    $: [button({ color: "primary", size: "large" })],
  }),
  visualCell("button-state-disabled", "button / disabled", {
    button: "Disabled",
    disabled: true,
    $: [button({ color: "primary" })],
  }),
  visualCell(
    "button-state-focus",
    "button / focus",
    { button: "Focus", $: [button({ color: "primary" })] },
    { focus: true },
  ),
  visualCell("button-state-busy", "button / busy", {
    button: "Loading…",
    ariaBusy: true,
    $: [button({ color: "primary" })],
  }),
  visualCell("buttonGhost-default", "buttonGhost / default", {
    button: "Ghost",
    $: [buttonGhost()],
  }),
  visualCell("buttonGhost-color-primary", "buttonGhost / primary", {
    button: "Primary",
    $: [buttonGhost({ color: "primary" })],
  }),
  visualCell("buttonGhost-color-danger", "buttonGhost / danger", {
    button: "Danger",
    $: [buttonGhost({ color: "danger" })],
  }),
  visualCell("buttonGhost-size-small", "buttonGhost / small", {
    button: "Small",
    $: [buttonGhost({ size: "small", color: "primary" })],
  }),
  visualCell("buttonGhost-size-large", "buttonGhost / large", {
    button: "Large",
    $: [buttonGhost({ size: "large", color: "primary" })],
  }),
  visualCell("buttonGhost-state-disabled", "buttonGhost / disabled", {
    button: "Disabled",
    disabled: true,
    $: [buttonGhost({ color: "primary" })],
  }),
  visualCell(
    "buttonGhost-state-focus",
    "buttonGhost / focus",
    { button: "Focus", $: [buttonGhost({ color: "primary" })] },
    { focus: true },
  ),
  visualCell("buttonSwitch-default", "buttonSwitch / on", {
    button: [{ span: null }],
    _doctorDisable: "missing-color",
    $: [buttonSwitch({ checked: switchOn })],
  }),
  visualCell("buttonSwitch-state-off", "buttonSwitch / off", {
    button: [{ span: null }],
    _doctorDisable: "missing-color",
    $: [buttonSwitch({ checked: false })],
  }),
  visualCell("buttonSwitch-color-primary", "buttonSwitch / primary", {
    button: [{ span: null }],
    _doctorDisable: "missing-color",
    $: [buttonSwitch({ checked: true, accentColor: "primary" })],
  }),
  visualCell("buttonSwitch-state-disabled", "buttonSwitch / disabled", {
    button: [{ span: null }],
    disabled: true,
    _doctorDisable: "missing-color",
    $: [buttonSwitch({ checked: true })],
  }),
  visualCell("linkButton-default", "linkButton / default", {
    a: "Link button",
    href: "#",
    $: [linkButton()],
  }),
  visualCell("linkButton-variant-solid", "linkButton / solid", {
    a: "Solid",
    href: "#",
    $: [linkButton({ variant: "solid", color: "primary" })],
  }),
  visualCell("linkButton-variant-outline", "linkButton / outline", {
    a: "Outline",
    href: "#",
    $: [linkButton({ variant: "outline", color: "primary" })],
  }),
  visualCell("linkButton-variant-ghost", "linkButton / ghost", {
    a: "Ghost",
    href: "#",
    $: [linkButton({ variant: "ghost", color: "neutral" })],
  }),
  visualCell("linkButton-color-danger", "linkButton / danger", {
    a: "Danger",
    href: "#",
    $: [linkButton({ color: "danger" })],
  }),
  visualCell("linkButton-color-success", "linkButton / success", {
    a: "Success",
    href: "#",
    $: [linkButton({ color: "success" })],
  }),
  visualCell("linkButton-size-small", "linkButton / small", {
    a: "Small",
    href: "#",
    $: [linkButton({ size: "small", color: "primary" })],
  }),
  visualCell("linkButton-size-large", "linkButton / large", {
    a: "Large",
    href: "#",
    $: [linkButton({ size: "large", color: "primary" })],
  }),
  visualCell("linkButton-state-disabled", "linkButton / disabled", {
    a: "Disabled",
    href: "#",
    ariaDisabled: "true",
    $: [linkButton({ color: "primary" })],
  }),
  visualCell("fab-default", "fab / default", {
    button: "+",
    $: [fab()],
  }),
  visualCell("fab-size-small", "fab / small", {
    button: "+",
    $: [fab({ size: "small" })],
  }),
  visualCell("fab-size-large", "fab / large", {
    button: "+",
    $: [fab({ size: "large" })],
  }),
  visualCell("fab-color-danger", "fab / danger", {
    button: "×",
    $: [fab({ color: "danger" })],
  }),
  visualCell("fab-color-success", "fab / success", {
    button: "✓",
    $: [fab({ color: "success" })],
  }),
]);

const inputs = visualSection("Inputs", [
  visualCell("inputText-default", "inputText / default", {
    input: null,
    placeholder: "Placeholder",
    $: [inputText()],
  }),
  visualCell("inputText-state-disabled", "inputText / disabled", {
    input: null,
    value: "Disabled",
    disabled: true,
    $: [inputText()],
  }),
  visualCell(
    "inputText-state-focus",
    "inputText / focus",
    { input: null, value: "Focused", $: [inputText()] },
    { focus: true },
  ),
  visualCell("inputText-state-error", "inputText / error", {
    input: null,
    value: "Error",
    dataStatus: "error",
    $: [inputText()],
  }),
  visualCell("inputPassword-default", "inputPassword / default", {
    div: null,
    $: [inputPassword()],
  }),
  visualCell("inputPassword-color-success", "inputPassword / success", {
    div: null,
    $: [inputPassword({ accentColor: "success" })],
  }),
  visualCell("inputSearch-default", "inputSearch / default", {
    input: null,
    placeholder: "Search…",
    $: [inputSearch()],
  }),
  visualCell("inputSearch-state-disabled", "inputSearch / disabled", {
    input: null,
    disabled: true,
    $: [inputSearch()],
  }),
  visualCell(
    "inputSearch-state-focus",
    "inputSearch / focus",
    { input: null, value: "query", $: [inputSearch()] },
    { focus: true },
  ),
  visualCell("inputNumber-default", "inputNumber / default", {
    input: null,
    value: "42",
    $: [inputNumber()],
  }),
  visualCell("inputNumber-state-disabled", "inputNumber / disabled", {
    input: null,
    value: "0",
    disabled: true,
    $: [inputNumber()],
  }),
  visualCell(
    "inputNumber-state-focus",
    "inputNumber / focus",
    { input: null, value: "7", $: [inputNumber()] },
    { focus: true },
  ),
  visualCell("inputFile-default", "inputFile / default", {
    input: null,
    $: [inputFile()],
  }),
  visualCell("inputFile-state-disabled", "inputFile / disabled", {
    input: null,
    disabled: true,
    $: [inputFile()],
  }),
  visualCell("inputColor-default", "inputColor / default", {
    input: null,
    value: "#4f7cff",
    $: [inputColor()],
  }),
  visualCell("inputColor-state-disabled", "inputColor / disabled", {
    input: null,
    value: "#4f7cff",
    disabled: true,
    $: [inputColor()],
  }),
  visualCell("inputDateTime-default", "inputDateTime / datetime", {
    input: null,
    $: [inputDateTime()],
  }),
  visualCell("inputDateTime-mode-date", "inputDateTime / date", {
    input: null,
    $: [inputDateTime({ mode: "date" })],
  }),
  visualCell("inputDateTime-mode-time", "inputDateTime / time", {
    input: null,
    $: [inputDateTime({ mode: "time" })],
  }),
  visualCell("inputDateTime-state-disabled", "inputDateTime / disabled", {
    input: null,
    disabled: true,
    $: [inputDateTime({ mode: "date" })],
  }),
  visualCell("inputRange-default", "inputRange / default", {
    input: null,
    value: "50",
    _doctorDisable: "missing-color",
    $: [inputRange()],
  }),
  visualCell("inputRange-color-primary", "inputRange / primary", {
    input: null,
    value: "70",
    _doctorDisable: "missing-color",
    $: [inputRange({ accentColor: "primary" })],
  }),
  visualCell("inputRange-state-disabled", "inputRange / disabled", {
    input: null,
    value: "30",
    disabled: true,
    _doctorDisable: "missing-color",
    $: [inputRange()],
  }),
  visualCell("inputCheckbox-default", "inputCheckbox / default", {
    input: null,
    _doctorDisable: "missing-color",
    $: [inputCheckbox()],
  }),
  visualCell("inputCheckbox-state-checked", "inputCheckbox / checked", {
    input: null,
    checked: true,
    _doctorDisable: "missing-color",
    $: [inputCheckbox()],
  }),
  visualCell("inputCheckbox-state-disabled", "inputCheckbox / disabled", {
    input: null,
    checked: true,
    disabled: true,
    _doctorDisable: "missing-color",
    $: [inputCheckbox()],
  }),
  visualCell(
    "inputCheckbox-state-focus",
    "inputCheckbox / focus",
    {
      input: null,
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    { focus: true },
  ),
  visualCell("inputRadio-default", "inputRadio / default", {
    input: null,
    name: "vis-radio",
    _doctorDisable: "missing-color",
    $: [inputRadio()],
  }),
  visualCell("inputRadio-state-checked", "inputRadio / checked", {
    input: null,
    name: "vis-radio-c",
    checked: true,
    _doctorDisable: "missing-color",
    $: [inputRadio()],
  }),
  visualCell("inputRadio-state-disabled", "inputRadio / disabled", {
    input: null,
    checked: true,
    disabled: true,
    _doctorDisable: "missing-color",
    $: [inputRadio()],
  }),
  visualCell("inputSwitch-default", "inputSwitch / off", {
    input: null,
    _doctorDisable: "missing-color",
    $: [inputSwitch()],
  }),
  visualCell("inputSwitch-state-checked", "inputSwitch / on", {
    input: null,
    checked: true,
    _doctorDisable: "missing-color",
    $: [inputSwitch()],
  }),
  visualCell("inputSwitch-state-disabled", "inputSwitch / disabled", {
    input: null,
    checked: true,
    disabled: true,
    _doctorDisable: "missing-color",
    $: [inputSwitch()],
  }),
  visualCell("inputOTP-default", "inputOTP / default", {
    div: Array.from({ length: 6 }, (_, i) => ({
      input: null,
      maxlength: 1,
      $: [inputText()],
      _key: i,
    })),
    $: [inputOTP()],
  }),
  visualCell("textarea-default", "textarea / default", {
    textarea: "Enter text…",
    $: [textarea()],
  }),
  visualCell("textarea-state-disabled", "textarea / disabled", {
    textarea: "Disabled",
    disabled: true,
    $: [textarea()],
  }),
  visualCell(
    "textarea-state-focus",
    "textarea / focus",
    { textarea: "Focused", $: [textarea()] },
    { focus: true },
  ),
  visualCell("select-default", "select / default", {
    select: selectOpts(),
    $: [select()],
  }),
  visualCell("select-state-disabled", "select / disabled", {
    select: selectOpts(),
    disabled: true,
    $: [select()],
  }),
  visualCell(
    "select-state-focus",
    "select / focus",
    { select: selectOpts(), $: [select()] },
    { focus: true },
  ),
  visualCell("label-default", "label / default", {
    label: "Field label",
    $: [label()],
  }),
  visualCell(
    "formGroup-default",
    "formGroup / horizontal",
    {
      fieldset: [
        { legend: "Contact" },
        { label: "Name", $: [label()] },
        { input: null, placeholder: "Ada", $: [inputText()] },
      ],
      $: [formGroup()],
      style: { width: "100%", color: (l) => themeColor(l, "text") },
    },
    { minWidth: "280px" },
  ),
  visualCell(
    "formGroup-layout-vertical",
    "formGroup / vertical",
    {
      fieldset: [
        { legend: "Contact" },
        { label: "Email", $: [label()] },
        { input: null, placeholder: "a@b.c", $: [inputText()] },
      ],
      $: [formGroup({ layout: "vertical" })],
      style: { width: "100%", color: (l) => themeColor(l, "text") },
    },
    { minWidth: "240px" },
  ),
]);

const feedback = visualSection("Feedback & status", [
  visualCell(
    "alert-default",
    "alert / default",
    { div: "Informational message.", $: [alert()] },
    { minWidth: "260px" },
  ),
  visualCell(
    "alert-color-primary",
    "alert / primary",
    { div: "Primary alert.", $: [alert({ color: "primary" })] },
    { minWidth: "260px" },
  ),
  visualCell(
    "alert-color-success",
    "alert / success",
    { div: "Saved successfully.", $: [alert({ color: "success" })] },
    { minWidth: "260px" },
  ),
  visualCell(
    "alert-color-danger",
    "alert / danger",
    { div: "Something failed.", $: [alert({ color: "danger" })] },
    { minWidth: "260px" },
  ),
  visualCell(
    "alert-color-warning",
    "alert / warning",
    { div: "Please review.", $: [alert({ color: "warning" })] },
    { minWidth: "260px" },
  ),
  visualCell(
    "progress-default",
    "progress / default",
    {
      progress: null,
      max: 100,
      value: 45,
      _doctorDisable: "missing-color",
      $: [progress()],
      style: { width: "100%" },
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "progress-color-success",
    "progress / success",
    {
      progress: null,
      max: 100,
      value: 72,
      _doctorDisable: "missing-color",
      $: [progress({ accentColor: "success" })],
      style: { width: "100%" },
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "progress-color-danger",
    "progress / danger",
    {
      progress: null,
      max: 100,
      value: 30,
      _doctorDisable: "missing-color",
      $: [progress({ accentColor: "danger" })],
      style: { width: "100%" },
    },
    { minWidth: "200px" },
  ),
  visualCell("ringProgress-default", "ringProgress / default", {
    div: null,
    _doctorDisable: "missing-color",
    $: [ringProgress({ value: ringValue, color: "primary" })],
  }),
  visualCell("ringProgress-color-success", "ringProgress / success", {
    div: null,
    _doctorDisable: "missing-color",
    $: [ringProgress({ value: 80, color: "success", size: 16 })],
  }),
  visualCell("ringProgress-color-danger", "ringProgress / danger", {
    div: null,
    _doctorDisable: "missing-color",
    $: [ringProgress({ value: 40, color: "danger", size: 16 })],
  }),
  visualCell("spinner-default", "spinner / default", {
    span: null,
    $: [spinner()],
  }),
  visualCell("spinner-color-primary", "spinner / primary", {
    span: null,
    $: [spinner({ color: "primary" })],
  }),
  visualCell("spinner-color-success", "spinner / success", {
    span: null,
    $: [spinner({ color: "success" })],
  }),
  visualCell("spinner-color-danger", "spinner / danger", {
    span: null,
    $: [spinner({ color: "error" })],
  }),
  visualCell(
    "skeleton-default",
    "skeleton / default",
    {
      div: "",
      $: [skeleton()],
      style: { width: "100%", height: themeSpacing(5) },
    },
    { minWidth: "180px" },
  ),
  visualCell("skeleton-shape-circle", "skeleton / circle", {
    div: "",
    $: [skeleton()],
    style: {
      width: themeSpacing(12),
      height: themeSpacing(12),
      borderRadius: "50%",
    },
  }),
  visualCell(
    "empty-default",
    "empty / default",
    {
      div: [
        { span: "📭" },
        { h3: "No items", $: [heading()] },
        { small: "Add your first item", $: [small()] },
      ],
      $: [empty()],
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "empty-color-neutral",
    "empty / neutral",
    {
      div: [
        { span: "🔍" },
        { h3: "No results", $: [heading()] },
        { small: "Try another query", $: [small()] },
      ],
      $: [empty({ color: "neutral" })],
    },
    { minWidth: "220px" },
  ),
  visualCell("rating-default", "rating / default", {
    div: null,
    $: [rating({ value: ratingState })],
  }),
  visualCell("rating-state-readonly", "rating / readonly", {
    div: null,
    $: [rating({ value: 4, readOnly: true })],
  }),
  visualCell(
    "toast-default",
    "toast / default",
    {
      div: "Saved successfully",
      $: [toast({ position: "bottom-right" })],
      style: { position: "relative", minHeight: themeSpacing(12) },
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "toast-color-success",
    "toast / success",
    {
      div: "Success toast",
      $: [toast({ position: "top-right", color: "success" })],
      style: { position: "relative", minHeight: themeSpacing(12) },
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "toast-color-danger",
    "toast / danger",
    {
      div: "Error toast",
      $: [toast({ position: "top-left", color: "danger" })],
      style: { position: "relative", minHeight: themeSpacing(12) },
    },
    { minWidth: "220px" },
  ),
]);

const overlays = visualSection("Overlays", [
  visualCell(
    "dialog-default",
    "dialog / open",
    {
      dialog: [
        { h3: "Confirm", $: [heading()] },
        { p: "Force-open dialog for visual capture.", $: [paragraph()] },
        { button: "OK", $: [button({ color: "primary" })] },
      ],
      $: [dialog({ open: dialogOpen })],
    },
    { minWidth: "280px" },
  ),
  visualCell(
    "drawer-default",
    "drawer / open",
    {
      dialog: [
        { p: "Drawer panel (right).", $: [paragraph()] },
        { button: "Close", $: [button()] },
      ],
      $: [drawer({ open: drawerOpen, placement: "right" })],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "popover-default",
    "popover / open",
    {
      button: "Anchor",
      $: [
        button(),
        popover({ open: popoverOpen, placement: "bottom", content: popoverContent }),
      ],
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "popoverArrow-default",
    "popoverArrow / with popover",
    {
      button: "Arrow",
      $: [
        button({ color: "primary" }),
        popover({
          open: toState(true),
          placement: "top",
          content: {
            div: "With arrow",
            dataTone: "shift-17",
            style: {
              padding: themeSpacing(3),
              borderRadius: themeSpacing(2),
              backgroundColor: (l) => themeColor(l, "inherit"),
              color: (l) => themeColor(l, "text"),
            },
            $: [popoverArrow({ placement: "top" })],
          },
        }),
      ],
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "tooltip-default",
    "tooltip / open",
    {
      button: "Hover",
      $: [button(), tooltip({ open: tooltipOpen, content: "Tooltip text" })],
    },
    { minWidth: "140px" },
  ),
  visualCell(
    "menu-default",
    "menu / default",
    {
      div: null,
      _doctorDisable: "missing-color",
      $: [
        menu({
          items: [
            { label: "Profile", key: "p" },
            { label: "Settings", key: "s" },
            { label: "Sign out", key: "o" },
          ],
          activeKey: "s",
        }),
      ],
    },
    { minWidth: "180px" },
  ),
  visualCell(
    "menu-color-primary",
    "menu / primary accent",
    {
      div: null,
      _doctorDisable: "missing-color",
      $: [
        menu({
          items: [
            { label: "One", key: "1" },
            { label: "Two", key: "2" },
          ],
          activeKey: "1",
          accentColor: "primary",
        }),
      ],
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "selectBox-default",
    "selectBox / open",
    {
      div: [],
      $: [
        selectBox({
          value: selectValue,
          options: fruitOptions,
          content: selectDropdown,
          open: selectBoxOpen,
        }),
      ],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "selectList-default",
    "selectList / items",
    {
      div: fruitOptions.map((f) => ({
        div: f.label,
        $: [selectItem({ value: f.value })],
      })),
      $: [selectList({ value: selectValue })],
    },
    { minWidth: "180px" },
  ),
  visualCell(
    "selectItem-default",
    "selectItem / default",
    {
      div: "Cherry",
      $: [selectItem({ value: "cherry" })],
    },
    { minWidth: "140px" },
  ),
  visualCell(
    "combobox-default",
    "combobox / open",
    {
      div: [],
      $: [
        combobox({
          value: comboboxValue,
          options: fruitOptions,
          content: comboboxDropdown,
          open: comboboxOpen,
        }),
      ],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "datePicker-default",
    "datePicker / default",
    {
      input: null,
      placeholder: "Pick a date",
      $: [inputText(), datePicker()],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "datePicker-mode-range",
    "datePicker / range",
    {
      input: null,
      placeholder: "Pick a range",
      $: [inputText(), datePicker({ mode: "range" })],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "command-default",
    "command / default",
    {
      div: [
        { input: null, $: [commandSearch()], placeholder: "Search…" },
        { button: "New File", $: [commandItem()] },
        { button: "Open Folder", $: [commandItem()] },
        { button: "Save As…", $: [commandItem()] },
      ],
      $: [command()],
      style: { width: "100%" },
    },
    { minWidth: "240px" },
  ),
]);

const navigation = visualSection("Navigation & selection", [
  visualCell(
    "tabs-default",
    "tabs / default",
    {
      div: null,
      $: [
        tabs({
          items: [
            { label: "Overview", content: { p: "Overview", $: [paragraph()] } },
            { label: "API", content: { p: "API", $: [paragraph()] } },
            { label: "Usage", content: { p: "Usage", $: [paragraph()] } },
          ],
        }),
      ],
    },
    { minWidth: "280px" },
  ),
  visualCell(
    "segmented-default",
    "segmented / default",
    {
      div: null,
      style: { color: (l) => themeColor(l, "text") },
      $: [
        segmented({
          value: "month",
          items: [
            { label: "Day", key: "day" },
            { label: "Week", key: "week" },
            { label: "Month", key: "month" },
            { label: "Year", key: "year" },
          ],
        }),
      ],
    },
    { minWidth: "260px" },
  ),
  visualCell(
    "toggleGroup-default",
    "toggleGroup / single",
    {
      div: null,
      _doctorDisable: "missing-color",
      $: [
        toggleGroup({
          value: "bold",
          items: [
            { label: "B", key: "bold" },
            { label: "I", key: "italic" },
            { label: "U", key: "underline" },
          ],
        }),
      ],
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "toggleGroup-multiple",
    "toggleGroup / multiple",
    {
      div: null,
      _doctorDisable: "missing-color",
      $: [
        toggleGroup({
          value: ["b", "i"],
          multiple: true,
          items: [
            { label: "B", key: "b" },
            { label: "I", key: "i" },
            { label: "U", key: "u" },
          ],
        }),
      ],
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "pagination-default",
    "pagination / default",
    {
      div: "",
      $: [pagination({ value: pageState, total: 8 })],
    },
    { minWidth: "280px" },
  ),
  visualCell(
    "steps-default",
    "steps / default",
    {
      ol: null,
      $: [
        steps({
          current: stepState,
          items: [
            { label: "Account" },
            { label: "Details" },
            { label: "Confirm" },
          ],
        }),
      ],
    },
    { minWidth: "300px" },
  ),
  visualCell(
    "breadcrumb-default",
    "breadcrumb / default",
    {
      nav: [
        { a: "Home", href: "#", $: [link()] },
        { a: "Docs", href: "#", $: [link()] },
        { span: "Patches", ariaCurrent: "page" },
      ],
      $: [breadcrumb()],
    },
    { minWidth: "240px" },
  ),
  visualCell(
    "breadcrumbEllipsis-default",
    "breadcrumbEllipsis",
    {
      nav: [
        { a: "Home", href: "#", $: [link()] },
        { button: "…", $: [breadcrumbEllipsis()] },
        { a: "UI", href: "#", $: [link()] },
        { span: "Here", ariaCurrent: "page" },
      ],
      $: [breadcrumb()],
    },
    { minWidth: "240px" },
  ),
  visualCell(
    "accordion-default",
    "accordion + details",
    {
      div: [
        {
          details: [
            { summary: "Section A" },
            { p: "Accordion panel A.", $: [paragraph()] },
          ],
          $: [details()],
          open: true,
        },
        {
          details: [
            { summary: "Section B" },
            { p: "Accordion panel B.", $: [paragraph()] },
          ],
          $: [details()],
        },
      ],
      $: [accordion()],
      _doctorDisable: "missing-color",
    },
    { minWidth: "260px" },
  ),
  visualCell(
    "details-default",
    "details / default",
    {
      details: [
        { summary: "More info" },
        { p: "Collapsed details body.", $: [paragraph()] },
      ],
      $: [details()],
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "list-default",
    "list + listItem + listItemButton",
    {
      ul: ["Inbox", "Sent", "Drafts"].map(
        (labelText): DomphyElement<"li"> => ({
          li: {
            button: labelText,
            $: [listItemButton()],
          } as DomphyElement,
          $: [listItem()],
          _doctorDisable: "missing-color",
          _key: labelText,
        }),
      ),
      $: [list()],
      style: { width: "100%" },
    },
    { minWidth: "180px" },
  ),
  visualCell(
    "link-default",
    "link / default",
    { a: "Documentation", href: "#", $: [link()] },
  ),
  visualCell("link-state-disabled", "link / disabled", {
    a: "Disabled",
    href: "#",
    disabled: true,
    $: [link()],
  }),
]);

const dataDisplay = visualSection("Data display", [
  visualCell("avatar-default", "avatar / default", {
    span: "AB",
    $: [avatar()],
  }),
  visualCell("avatar-color-primary", "avatar / primary", {
    span: "PR",
    $: [avatar({ color: "primary" })],
  }),
  visualCell("avatar-color-success", "avatar / success", {
    span: "OK",
    $: [avatar({ color: "success" })],
  }),
  visualCell("avatar-color-danger", "avatar / danger", {
    span: "ER",
    $: [avatar({ color: "error" })],
  }),
  visualCell("badge-default", "badge / default", {
    span: [{ button: "Inbox", $: [button()] }],
    $: [badge({ label: 12 })],
  }),
  visualCell("badge-color-primary", "badge / primary", {
    span: [{ button: "Msg", $: [button()] }],
    $: [badge({ label: 3, color: "primary" })],
  }),
  visualCell("badge-color-success", "badge / success", {
    span: [{ button: "Done", $: [button()] }],
    $: [badge({ label: 1, color: "success" })],
  }),
  visualCell("tag-default", "tag / default", {
    span: "Default",
    $: [tag()],
  }),
  visualCell("tag-color-primary", "tag / primary", {
    span: "Primary",
    $: [tag({ color: "primary" })],
  }),
  visualCell("tag-color-danger", "tag / danger", {
    span: "Danger",
    $: [tag({ color: "danger" })],
  }),
  visualCell("tag-color-success", "tag / success", {
    span: "Success",
    $: [tag({ color: "success" })],
  }),
  visualCell("tag-state-removable", "tag / removable", {
    span: "Removable",
    $: [tag({ removable: true, color: "primary" })],
  }),
  visualCell(
    "card-default",
    "card / default",
    {
      div: [
        { h4: "Card title", $: [heading()] },
        { p: "Short description body.", $: [paragraph()] },
        {
          footer: [{ button: "Action", $: [button({ color: "primary" })] }],
        },
      ],
      $: [card()],
      style: { width: "100%" },
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "table-default",
    "table / default",
    {
      table: [
        {
          thead: [
            {
              tr: [
                { th: "Invoice" },
                { th: "Status" },
                { th: "Amount" },
              ],
            },
          ],
        },
        {
          tbody: [
            {
              tr: [{ td: "INV001" }, { td: "Paid" }, { td: "$250" }],
            },
            {
              tr: [{ td: "INV002" }, { td: "Pending" }, { td: "$150" }],
            },
          ],
        },
      ],
      $: [table()],
    },
    { minWidth: "280px" },
  ),
  visualCell(
    "timeline-default",
    "timeline + timelineItem",
    {
      ol: [
        {
          li: [
            { small: "Jan", $: [small()] },
            { h4: "Started", $: [heading()] },
          ],
          $: [timelineItem({ active: true })],
        },
        {
          li: [
            { small: "Mar", $: [small()] },
            { h4: "Shipped", $: [heading()] },
          ],
          $: [timelineItem({ active: true, last: true })],
        },
      ],
      $: [timeline()],
      style: { width: "100%" },
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "descriptionList-default",
    "descriptionList",
    {
      dl: [
        { dt: "Framework" },
        { dd: "Domphy" },
        { dt: "Language" },
        { dd: "TypeScript" },
      ],
      $: [descriptionList()],
    },
    { minWidth: "200px" },
  ),
  visualCell(
    "figure-default",
    "figure / default",
    {
      figure: [
        {
          img: null,
          src: CHART_IMG,
          alt: "Chart",
          style: { maxWidth: "100%", borderRadius: themeSpacing(2) },
        },
        { figcaption: "Figure 1. Sample chart." },
      ],
      $: [figure()],
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "image-default",
    "image / default",
    {
      img: null,
      src: CHART_IMG,
      alt: "Chart",
      _doctorDisable: "missing-color",
      $: [image()],
      style: { maxWidth: themeSpacing(48) },
    },
  ),
  visualCell(
    "image-color-primary",
    "image / primary",
    {
      img: null,
      src: CHART_IMG,
      alt: "Chart primary",
      _doctorDisable: "missing-color",
      $: [image({ color: "primary" })],
      style: { maxWidth: themeSpacing(48) },
    },
  ),
  visualCell("icon-default", "icon / default", {
    span: ICON_SVG,
    $: [icon()],
  }),
  visualCell(
    "scrollArea-default",
    "scrollArea / default",
    {
      div: Array.from({ length: 12 }, (_, i) => ({
        div: `Row ${i + 1}`,
        _key: i,
        style: {
          padding: themeSpacing(2),
          borderBottom: (l) => `1px solid ${themeColor(l, "border")}`,
        },
      })),
      $: [scrollArea()],
      _doctorDisable: "missing-color",
      style: {
        maxHeight: themeSpacing(32),
        width: "100%",
        outline: (l) => `1px solid ${themeColor(l, "border")}`,
        borderRadius: themeSpacing(2),
      },
    },
    { minWidth: "180px" },
  ),
]);

const layout = visualSection("Layout", [
  visualCell(
    "stack-default",
    "stack / default",
    {
      div: [box("A"), box("B"), box("C")],
      $: [stack()],
      style: { width: "100%" },
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "stack-gap-6",
    "stack / gap 6",
    {
      div: [box("A"), box("B")],
      $: [stack({ gap: 6, align: "center" })],
      style: { width: "100%" },
    },
    { minWidth: "160px" },
  ),
  visualCell(
    "row-default",
    "row / default",
    {
      div: [box("L"), box("C"), box("R")],
      $: [row()],
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "row-justify-space-between",
    "row / space-between",
    {
      div: [box("Left"), box("Right")],
      $: [row({ justify: "space-between" })],
      style: { width: "100%" },
    },
    { minWidth: "240px" },
  ),
  visualCell(
    "toolbar-default",
    "toolbar + spacer",
    {
      header: [
        { span: "Logo", $: [strong()] },
        toolbarSpacer(),
        { button: "Action", $: [button({ color: "primary", size: "small" })] },
      ],
      $: [toolbar()],
      style: { width: "100%" },
    },
    { minWidth: "260px" },
  ),
  visualCell(
    "panelSection-default",
    "panelSection / default",
    {
      div: [
        {
          div: [{ h4: "Section", $: [heading()] }, { p: "Body", $: [paragraph()] }],
          $: [stack({ gap: 1 }), panelSection({ divider: true })],
        },
        {
          div: [{ h4: "Next", $: [heading()] }, { p: "More", $: [paragraph()] }],
          $: [stack({ gap: 1 }), panelSection()],
        },
      ],
      $: [stack({ gap: 0 })],
      style: {
        width: "100%",
        outline: (l) => `1px solid ${themeColor(l, "border")}`,
        borderRadius: themeSpacing(2),
        overflow: "hidden",
      },
    },
    { minWidth: "220px" },
  ),
  visualCell(
    "splitter-default",
    "splitter + panels",
    {
      div: [
        { div: "Left", $: [splitterPanel()] },
        {
          div: null,
          $: [splitterHandle()],
          style: { width: themeSpacing(1) },
          _doctorDisable: "missing-color",
        },
        { div: "Right", $: [splitterPanel()] },
      ],
      $: [splitter()],
      style: { height: themeSpacing(32), width: "100%" },
    },
    { minWidth: "260px" },
  ),
  visualCell(
    "divider-default",
    "divider / default",
    { div: "or", $: [divider()], style: { width: "100%" } },
    { minWidth: "180px" },
  ),
  visualCell(
    "divider-color-primary",
    "divider / primary",
    { div: "or", $: [divider({ color: "primary" })], style: { width: "100%" } },
    { minWidth: "180px" },
  ),
  visualCell(
    "horizontalRule-default",
    "horizontalRule / default",
    { hr: "", $: [horizontalRule()], style: { width: "100%" } },
    { minWidth: "180px" },
  ),
  visualCell(
    "horizontalRule-color-primary",
    "horizontalRule / primary",
    {
      hr: "",
      $: [horizontalRule({ color: "primary" })],
      style: { width: "100%" },
    },
    { minWidth: "180px" },
  ),
]);

const typography = visualSection("Typography", [
  visualCell("heading-default", "heading / h2", {
    h2: "Heading",
    $: [heading()],
  }),
  visualCell("paragraph-default", "paragraph", {
    p: "Body paragraph text for visual regression.",
    $: [paragraph()],
  }),
  visualCell("small-default", "small", {
    small: "Caption / secondary",
    $: [small()],
  }),
  visualCell("small-color-error", "small / error", {
    small: "Error caption",
    $: [small({ color: "error" })],
  }),
  visualCell("strong-default", "strong", {
    strong: "Strong emphasis",
    $: [strong()],
  }),
  visualCell("emphasis-default", "emphasis", {
    em: "Italic emphasis",
    $: [emphasis()],
  }),
  visualCell("mark-default", "mark", {
    mark: "Highlighted",
    $: [mark()],
  }),
  visualCell("code-default", "code", {
    code: "const x = 1",
    $: [code()],
  }),
  visualCell("keyboard-default", "keyboard", {
    kbd: "Ctrl+K",
    $: [keyboard()],
  }),
  visualCell("abbreviation-default", "abbreviation", {
    abbr: "API",
    title: "Application Programming Interface",
    $: [abbreviation()],
  }),
  visualCell("subscript-default", "subscript", {
    span: ["H", { sub: "2", $: [subscript()] }, "O"],
  }),
  visualCell("superscript-default", "superscript", {
    span: ["x", { sup: "2", $: [superscript()] }],
  }),
  visualCell(
    "blockquote-default",
    "blockquote",
    {
      blockquote: "The best way to predict the future is to invent it.",
      $: [blockquote()],
    },
    { minWidth: "240px" },
  ),
  visualCell(
    "preformated-default",
    "preformated",
    {
      pre: "const x = 1\nconsole.log(x)",
      $: [preformated()],
    },
    { minWidth: "200px" },
  ),
  visualCell("orderedList-default", "orderedList", {
    ol: [{ li: "One" }, { li: "Two" }, { li: "Three" }],
    $: [orderedList()],
  }),
  visualCell("unorderedList-default", "unorderedList", {
    ul: [{ li: "Alpha" }, { li: "Beta" }, { li: "Gamma" }],
    $: [unorderedList()],
  }),
]);

const motionSection = visualSection("Motion", [
  visualCell("motion-default", "motion / default", {
    div: "Motion",
    $: [
      motion({
        initial: { opacity: 1, scale: 1 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0 },
      }),
    ],
    style: {
      display: "grid",
      placeItems: "center",
      width: themeSpacing(24),
      height: themeSpacing(12),
      borderRadius: themeSpacing(2),
      backgroundColor: (l) => themeColor(l, "shift-6", "primary"),
      color: (l) => themeColor(l, "shift-11", "primary"),
    },
  }),
  visualCell(
    "transitionGroup-default",
    "transitionGroup",
    {
      ul: (l) =>
        motionList.get(l).map((id) => ({
          li: `Item ${id}`,
          _key: id,
        })),
      $: [transitionGroup()],
    },
    { minWidth: "140px" },
  ),
]);

export default visualPage("UI patches visual catalog", [
  buttons,
  inputs,
  feedback,
  overlays,
  navigation,
  dataDisplay,
  layout,
  typography,
  motionSection,
]);
