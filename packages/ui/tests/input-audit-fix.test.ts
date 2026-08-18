// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inputColor,
  inputDateTime,
  inputFile,
  inputNumber,
  inputOTP,
  inputPassword,
  inputSearch,
  rating,
  textarea,
} from "../src/index.ts";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

// Reactive keyed row: every refresh re-invokes the patch factory on the same
// reused DOM node (lifecycle hooks do not re-run).
function mountReactive(child: () => DomphyElement) {
  const refresh = toState(0);
  const { host } = render({
    div: [
      {
        div: (listener: { get?: unknown }) => {
          refresh.get(listener as never);
          return [{ div: [child()], _key: 1 }];
        },
      },
    ],
  } as DomphyElement);
  const rerender = () => {
    refresh.set(refresh.get() + 1);
    flushSync();
  };
  return { host, rerender };
}

function filledStarCount(root: ParentNode): number {
  return Array.from(root.querySelectorAll("button")).filter((button) =>
    (button.innerHTML || "").includes("M12 17.27"),
  ).length;
}

// ---------------------------------------------------------------------------
// H07 + M23 — inputPassword
// ---------------------------------------------------------------------------

describe("H07 inputPassword forwards host form fields onto the real input", () => {
  it("puts host name/value/required on the inner input so FormData includes the password", () => {
    const { host } = render({
      form: [
        {
          div: null,
          name: "password",
          value: "s3cret",
          required: true,
          $: [inputPassword()],
        },
      ],
    } as DomphyElement);

    const field = host.querySelector("input") as HTMLInputElement;
    expect(field).not.toBeNull();
    expect(field.name).toBe("password");
    expect(field.value).toBe("s3cret");
    expect(field.required).toBe(true);

    const form = host.querySelector("form") as HTMLFormElement;
    const data = new FormData(form);
    expect(data.get("password")).toBe("s3cret");
  });

  it("forwards host onInput onto the real input", () => {
    const onInput = vi.fn();
    const { host } = render({
      div: null,
      onInput,
      $: [inputPassword()],
    } as DomphyElement);

    const field = host.querySelector("input") as HTMLInputElement;
    field.value = "typed";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onInput.mock.calls[0][0].target).toBe(field);
  });

  it("forwards host disabled onto the real input", () => {
    const { host } = render({
      div: null,
      disabled: true,
      $: [inputPassword()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("accepts name/value/onInput/disabled/required as patch props", () => {
    const onInput = vi.fn();
    const { host } = render({
      form: [
        {
          div: null,
          $: [
            inputPassword({
              name: "pw",
              value: "abc",
              onInput,
              required: true,
              disabled: false,
            }),
          ],
        },
      ],
    } as DomphyElement);

    const field = host.querySelector("input") as HTMLInputElement;
    expect(field.name).toBe("pw");
    expect(field.value).toBe("abc");
    expect(field.required).toBe(true);
    expect(new FormData(host.querySelector("form")!).get("pw")).toBe("abc");

    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(onInput).toHaveBeenCalledTimes(1);
  });
});

describe("M23 inputPassword autocomplete and ariaLabel props", () => {
  it("defaults autocomplete to current-password and aria-label to Password", () => {
    const { host } = render({
      div: null,
      $: [inputPassword()],
    } as DomphyElement);
    const field = host.querySelector("input") as HTMLInputElement;
    expect(field.autocomplete).toBe("current-password");
    expect(field.getAttribute("aria-label")).toBe("Password");
  });

  it("accepts autocomplete and ariaLabel props", () => {
    const { host } = render({
      div: null,
      $: [
        inputPassword({
          autocomplete: "new-password",
          ariaLabel: "New password",
        }),
      ],
    } as DomphyElement);
    const field = host.querySelector("input") as HTMLInputElement;
    expect(field.autocomplete).toBe("new-password");
    expect(field.getAttribute("aria-label")).toBe("New password");
  });
});

// ---------------------------------------------------------------------------
// H08 — rating reused-node props
// ---------------------------------------------------------------------------

describe("H08 rating behavior() keeps props live across reused-node re-renders", () => {
  it("calls the latest onChange after an ancestor re-render", () => {
    const first = vi.fn();
    const second = vi.fn();
    let onChange = first;
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [rating({ onChange })],
    }));

    (host.querySelectorAll("button")[2] as HTMLButtonElement).click();
    expect(first).toHaveBeenCalledWith(3);

    onChange = second;
    rerender();
    (host.querySelectorAll("button")[4] as HTMLButtonElement).click();
    expect(second).toHaveBeenCalledWith(5);
    expect(first).toHaveBeenCalledTimes(1);
  });

  it("honors a later readOnly=true so clicks no longer fire onChange", () => {
    const onChange = vi.fn();
    let readOnly = false;
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [rating({ onChange, readOnly })],
    }));

    (host.querySelectorAll("button")[0] as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledWith(1);

    readOnly = true;
    rerender();
    (host.querySelectorAll("button")[2] as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps a plain-number value live when the parent re-renders with a new number", () => {
    let value = 2;
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [rating({ value })],
    }));
    expect(filledStarCount(host)).toBe(2);

    value = 4;
    rerender();
    expect(filledStarCount(host)).toBe(4);
  });

  it("applies a later max so keyboard clamp uses the new ceiling", () => {
    const onChange = vi.fn();
    let max = 5;
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [rating({ value: 5, max, onChange })],
    }));
    expect(host.querySelectorAll("button").length).toBe(5);

    max = 3;
    rerender();
    expect(host.querySelectorAll("button").length).toBe(3);

    const last = host.querySelectorAll("button")[2] as HTMLButtonElement;
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(onChange).not.toHaveBeenCalledWith(4);
  });
});

// ---------------------------------------------------------------------------
// M20 — native type must win (no _onSchedule stomp)
// ---------------------------------------------------------------------------

describe("M20 native input type wins over patch default on first paint", () => {
  it("inputNumber does not stomp a native type", () => {
    const { host } = render({
      input: null,
      type: "text",
      $: [inputNumber()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).type).toBe("text");
  });

  it("inputSearch does not stomp a native type", () => {
    const { host } = render({
      input: null,
      type: "text",
      $: [inputSearch()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).type).toBe("text");
  });

  it("inputFile does not stomp a native type", () => {
    const { host } = render({
      input: null,
      type: "text",
      $: [inputFile()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).type).toBe("text");
  });

  it("inputColor does not stomp a native type", () => {
    const { host } = render({
      input: null,
      type: "text",
      $: [inputColor()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).type).toBe("text");
  });

  it("inputDateTime does not stomp a native type", () => {
    const { host } = render({
      input: null,
      type: "date",
      $: [inputDateTime()],
    } as DomphyElement);
    expect((host.querySelector("input") as HTMLInputElement).type).toBe("date");
  });

  it("still applies the patch default type when the host omits type", () => {
    const { host } = render({
      div: [
        { input: null, $: [inputNumber()] },
        { input: null, $: [inputSearch()] },
        { input: null, $: [inputFile()] },
        { input: null, $: [inputColor()] },
        { input: null, $: [inputDateTime({ mode: "time" })] },
      ],
    } as DomphyElement);
    const inputs = host.querySelectorAll("input");
    expect(inputs[0].type).toBe("number");
    expect(inputs[1].type).toBe("search");
    expect(inputs[2].type).toBe("file");
    expect(inputs[3].type).toBe("color");
    expect(inputs[4].type).toBe("time");
  });
});

// ---------------------------------------------------------------------------
// M21 — inputOTP paste dispatches input/change
// ---------------------------------------------------------------------------

describe("M21 inputOTP paste dispatches input/change on filled fields", () => {
  it("fires input and change on each assigned child so controlled values update", () => {
    const inputsOnInput = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    const inputsOnChange = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    const { host } = render({
      div: [
        {
          input: null,
          type: "text",
          onInput: inputsOnInput[0],
          onChange: inputsOnChange[0],
        },
        {
          input: null,
          type: "text",
          onInput: inputsOnInput[1],
          onChange: inputsOnChange[1],
        },
        {
          input: null,
          type: "text",
          onInput: inputsOnInput[2],
          onChange: inputsOnChange[2],
        },
        {
          input: null,
          type: "text",
          onInput: inputsOnInput[3],
          onChange: inputsOnChange[3],
        },
      ],
      $: [inputOTP()],
    } as DomphyElement);

    const fields = Array.from(
      host.querySelectorAll("input"),
    ) as HTMLInputElement[];
    const clipboardData = { getData: () => "4567" };
    const pasteEvent = new Event("paste", { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: clipboardData,
    });
    Object.defineProperty(pasteEvent, "target", { value: fields[0] });
    host.querySelector("div")!.dispatchEvent(pasteEvent);

    expect(fields.map((field) => field.value)).toEqual(["4", "5", "6", "7"]);
    for (let index = 0; index < 4; index++) {
      expect(inputsOnInput[index]).toHaveBeenCalled();
      expect(inputsOnChange[index]).toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// M22 — textarea autoResize on value updates
// ---------------------------------------------------------------------------

describe("M22 textarea autoResize follows value updates, not only mount", () => {
  it("resizes when a controlled value state changes", () => {
    const text = toState("hi");
    const { host } = render({
      textarea: null,
      value: (listener: { get?: unknown }) => text.get(listener as never),
      $: [textarea({ autoResize: true })],
    } as DomphyElement);

    const el = host.querySelector("textarea") as HTMLTextAreaElement;
    Object.defineProperty(el, "scrollHeight", {
      value: 80,
      configurable: true,
    });

    text.set("a much longer value that should grow the field");
    flushSync();
    expect(el.style.height).toBe("80px");
  });
});
