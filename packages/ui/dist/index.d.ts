import { PartialElement, ValueOrState, DomphyElement, Notifier, Handler } from '@domphy/core';
import { ThemeColor } from '@domphy/theme';
import { Placement as Placement$1 } from '@floating-ui/dom';

declare function abbreviation(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function card(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function splitter(props?: {
    direction?: "horizontal" | "vertical";
    defaultSize?: number;
    min?: number;
    max?: number;
}): PartialElement;
declare function splitterPanel(): PartialElement;
declare function splitterHandle(): PartialElement;

declare function command(): PartialElement;
declare function commandSearch(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;
declare function commandItem(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function toggle(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function toggleGroup(props?: {
    value?: ValueOrState<string | string[]>;
    multiple?: boolean;
    color?: ThemeColor;
}): PartialElement;

declare function inputOTP(): PartialElement;

declare function alert(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function avatar(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function badge(props?: {
    color?: ThemeColor;
    label?: ValueOrState<string | number>;
}): PartialElement;

declare function breadcrumb(props?: {
    color?: ThemeColor;
    separator?: string;
}): PartialElement;

declare function breadcrumbEllipsis(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function combobox(props: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null | undefined> | number | string | null | undefined>;
    options?: Array<{
        label: string;
        value: string;
    }>;
    placement?: ValueOrState<Placement$1>;
    content: DomphyElement;
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement$1) => void;
    input?: DomphyElement;
}): PartialElement;

declare function popoverArrow(props?: {
    placement?: ValueOrState<Placement$1>;
    sideOffset?: string;
    color?: ThemeColor;
    bordered?: boolean;
}): PartialElement;

declare function blockquote(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function button(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function inputCheckbox(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function code(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function details(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
    duration?: number;
}): PartialElement;

declare function descriptionList(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function dialog(props?: {
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
}): PartialElement;

declare function emphasis(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function figure(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function formGroup(props?: {
    color?: ThemeColor;
    layout?: "horizontal" | "vertical";
}): PartialElement;

declare function heading(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function horizontalRule(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function image(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function icon(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function inputColor(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

type InputDateTimeMode = "date" | "time" | "week" | "month" | "datetime-local";
declare function inputDateTime(props?: {
    mode?: InputDateTimeMode;
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputFile(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputSearch(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputText(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputRange(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputNumber(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function keyboard(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function label(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function link(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function mark(props?: {
    accentColor?: ThemeColor;
}): PartialElement;

declare function paragraph(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function preformated(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function progress(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function inputRadio(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function select(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function skeleton(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function spinner(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function selectList(props?: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null> | number | string | null>;
    color?: ThemeColor;
    name?: string;
}): PartialElement;

declare function selectItem(props?: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
    value?: number | string;
}): PartialElement;

declare function selectBox(props: {
    multiple?: boolean;
    value?: ValueOrState<Array<number | string | null | undefined> | number | string | null | undefined>;
    options?: Array<{
        label: string;
        value: string;
    }>;
    placement?: ValueOrState<Placement$1>;
    content: DomphyElement;
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement$1) => void;
}): PartialElement;

declare function inputSwitch(props?: {
    accentColor?: ThemeColor;
}): PartialElement;

declare function buttonSwitch(props?: {
    checked?: ValueOrState<boolean>;
    accentColor?: ThemeColor;
    color?: ThemeColor;
}): PartialElement;

declare function small(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function strong(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function subscript(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function superscript(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function table(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function textarea(props?: {
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function unorderedList(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function orderedList(props?: {
    color?: ThemeColor;
}): PartialElement;

declare function pagination(props: {
    value?: ValueOrState<number>;
    total: number;
    color?: ThemeColor;
    accentColor?: ThemeColor;
}): PartialElement;

declare function divider(props?: {
    color?: ThemeColor;
}): PartialElement;

type Placement = "left" | "right" | "top" | "bottom";
declare function drawer(props?: {
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    placement?: Placement;
    size?: string;
}): PartialElement;

declare function popover(props: {
    openOn: "click" | "hover";
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement$1>;
    content: DomphyElement;
    onPlacement?: (anchor: HTMLElement, popover: HTMLElement, placement: Placement$1) => void;
}): PartialElement;

type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
declare function toast(props?: {
    position?: ToastPosition;
    color?: ThemeColor;
}): PartialElement;

declare function tooltip(props?: {
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement$1>;
    content?: DomphyElement | string;
}): PartialElement;

declare function transitionGroup(props?: {
    duration?: number;
    delay?: number;
}): PartialElement;

declare function tabs(props?: {
    activeKey?: ValueOrState<number | string>;
}): PartialElement;

declare function tab(props?: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
}): PartialElement;

declare function tabPanel(): PartialElement;

declare function tag(props?: {
    color?: ThemeColor;
    removable?: boolean;
}): PartialElement;

declare function menu(props?: {
    activeKey?: ValueOrState<number | string>;
    color?: ThemeColor;
}): PartialElement;

declare function menuItem(props?: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
}): PartialElement;

type FieldStatus = "error" | "warning" | "success" | undefined;
type FieldMessages = {
    error?: string;
    warning?: string;
    success?: string;
};
type FieldValidator = (value: unknown) => FieldMessages | null | Promise<FieldMessages | null>;
declare class FieldState {
    _notifier: Notifier;
    _value: unknown;
    _initValue: unknown;
    _messages: FieldMessages;
    _touched: boolean;
    _validator: FieldValidator | undefined;
    _pending: boolean;
    _validationToken: number;
    constructor(initValue: unknown, validator?: FieldValidator);
    value(listener?: Handler): unknown;
    setValue(val: unknown): void;
    dirty(listener?: Handler): boolean;
    touched(listener?: Handler): boolean;
    setTouched(): void;
    configure(initValue?: unknown, validator?: FieldValidator): void;
    message(type: keyof FieldMessages, listener?: Handler): string | undefined;
    status(listener?: Handler): FieldStatus;
    setMessages(next: FieldMessages): void;
    reset(): void;
    validate(): void;
    _dispose(): void;
}

declare class FormState {
    fields: Map<string, FieldState>;
    setField(path: string, initValue?: unknown, validator?: FieldValidator): FieldState;
    getField(path: string): FieldState;
    removeField(path: string): void;
    get valid(): boolean;
    reset(): void;
    snapshot(): Record<string, unknown>;
    _dispose(): void;
}

declare function form(state: FormState): PartialElement;

declare function field(path: string, validator?: FieldValidator): PartialElement;

export { type FieldMessages, FieldState, type FieldStatus, type FieldValidator, FormState, abbreviation, alert, avatar, badge, blockquote, breadcrumb, breadcrumbEllipsis, button, buttonSwitch, card, code, combobox, command, commandItem, commandSearch, descriptionList, details, dialog, divider, drawer, emphasis, field, figure, form, formGroup, heading, horizontalRule, icon, image, inputCheckbox, inputColor, inputDateTime, inputFile, inputNumber, inputOTP, inputRadio, inputRange, inputSearch, inputSwitch, inputText, keyboard, label, link, mark, menu, menuItem, orderedList, pagination, paragraph, popover, popoverArrow, preformated, progress, select, selectBox, selectItem, selectList, skeleton, small, spinner, splitter, splitterHandle, splitterPanel, strong, subscript, superscript, tab, tabPanel, table, tabs, tag, textarea, toast, toggle, toggleGroup, tooltip, transitionGroup, unorderedList };
