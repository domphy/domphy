// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElementNode, type State, toState } from "@domphy/core";
import type { DomphyElement } from "@domphy/core";
import { datePicker, type DatePickerValue } from "../src/index.ts";

beforeEach(() => {
  vi.useFakeTimers();
  // @domphy/floating's autoUpdate uses ResizeObserver, absent in jsdom.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

function mount(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return host;
}

function openCalendar(host: HTMLElement) {
  const input = host.querySelector("input") as HTMLInputElement;
  input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  vi.advanceTimersByTime(200); // pass the show() debounce
}

function dayCells(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('[role="gridcell"]'));
}

function clickDay(text: string) {
  const cell = dayCells().find(
    (c) => c.textContent === text && c.getAttribute("aria-disabled") !== "true",
  );
  if (!cell) throw new Error(`day cell "${text}" not found`);
  cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  vi.advanceTimersByTime(200);
}

function clickDate(iso: string) {
  const cell = document.querySelector<HTMLElement>(`[data-date="${iso}"]`);
  if (!cell) throw new Error(`day cell "${iso}" not found`);
  cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  vi.advanceTimersByTime(200);
}

describe("datePicker", () => {
  it("renders a read-only input showing the formatted value", () => {
    const value = toState<DatePickerValue>(new Date(2024, 0, 15));
    const host = mount({
      input: null,
      $: [datePicker({ value, locale: "en-US" })],
    } as DomphyElement);
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toContain("2024");
    expect(input.value).toContain("15");
  });

  it("opens a 6-week grid (42 cells) for the viewed month", () => {
    const host = mount({
      input: null,
      $: [datePicker({ value: toState(new Date(2024, 0, 15)), locale: "en-US" })],
    } as DomphyElement);
    openCalendar(host);
    expect(dayCells().length).toBe(42);
  });

  it("selects a single date and writes it to the controlled state", () => {
    const value = toState<DatePickerValue>(new Date(2024, 0, 1));
    const host = mount({
      input: null,
      $: [datePicker({ value, locale: "en-US" })],
    } as DomphyElement);
    openCalendar(host);
    clickDay("15");
    const selected = value.get() as Date;
    expect(selected).toBeInstanceOf(Date);
    expect(selected.getFullYear()).toBe(2024);
    expect(selected.getMonth()).toBe(0);
    expect(selected.getDate()).toBe(15);
  });

  it("range mode produces an ordered [start, end] tuple", () => {
    // Start pre-set to Jun 15; clicking an earlier day reorders the tuple.
    const value = toState<DatePickerValue>([new Date(2024, 5, 15), null]);
    const host = mount({
      input: null,
      $: [datePicker({ mode: "range", value, locale: "en-US" })],
    } as DomphyElement);
    openCalendar(host); // view = June 2024 (primary selection)
    clickDate("2024-06-10"); // earlier than the 15th -> reordered
    const [start, end] = value.get() as [Date, Date];
    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(15);
  });

  it("disables days outside min/max", () => {
    const host = mount({
      input: null,
      $: [
        datePicker({
          value: toState(new Date(2024, 0, 15)),
          min: new Date(2024, 0, 10),
          max: new Date(2024, 0, 20),
          locale: "en-US",
        }),
      ],
    } as DomphyElement);
    openCalendar(host);
    const five = dayCells().find((c) => c.textContent === "5");
    const fifteen = dayCells().find((c) => c.textContent === "15");
    expect(five?.getAttribute("aria-disabled")).toBe("true");
    expect(fifteen?.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("time mode adds hour + minute selects", () => {
    const host = mount({
      input: null,
      $: [datePicker({ time: true, value: toState(new Date(2024, 0, 15, 9, 30)), locale: "en-US" })],
    } as DomphyElement);
    openCalendar(host);
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBe(2);
    // 24 hours + 60 minutes
    expect(selects[0].querySelectorAll("option").length).toBe(24);
    expect(selects[1].querySelectorAll("option").length).toBe(60);
  });

  it("localizes the month label", () => {
    const host = mount({
      input: null,
      $: [datePicker({ value: toState(new Date(2024, 0, 15)), locale: "fr-FR" })],
    } as DomphyElement);
    openCalendar(host);
    const label = document.querySelector('[aria-live="polite"]');
    expect(label?.textContent?.toLowerCase()).toContain("janvier");
  });
});
