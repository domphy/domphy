import type { PartialElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

/**
 * Lays out a one-time-password container as a horizontal row of inputs and
 * wires keyboard navigation: auto-advance on input, backspace/arrow movement,
 * and paste distribution across the child inputs. Apply to a container element
 * (e.g. `<div>`) whose direct children are the OTP `<input>` boxes. Takes no
 * props.
 *
 * @example { div: [{ input: null }, { input: null }], $: [inputOTP()] }
 */
function inputOTP(): PartialElement {
  return {
    // Group naming so aria-label on the host is valid (not a bare div).
    role: "group",
    ariaLabel: "One-time password",
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
      // Tag selector, not "& > *": specificity (0,1,1) beats a single class
      // (0,1,0) on its own, so this reliably wins over a box's own
      // minWidth without needing !important — same cascade contract as
      // AGENTS.md's descendant-color-override rule.
      "& > input": {
        minWidth: themeSpacing(9),
      },
    },
    _onMount: (node) => {
      const container = node.domElement as HTMLElement;
      const getInputs = () =>
        Array.from(container.querySelectorAll("input")) as HTMLInputElement[];

      const onInput = (e: Event) => {
        // An IME (Japanese/Chinese/Korean) fires `input` for each keystroke of
        // an unfinished composition. Advancing focus there tears the
        // composition apart mid-word; wait for the commit.
        if ((e as InputEvent).isComposing) return;
        const inputs = getInputs();
        const target = e.target as HTMLInputElement;
        const index = inputs.indexOf(target);
        if (target.value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      };

      const onKeydown = (e: KeyboardEvent) => {
        // keydown during composition reports key "Process"/229; leave it alone.
        if (e.isComposing) return;
        const inputs = getInputs();
        const target = e.target as HTMLInputElement;
        const index = inputs.indexOf(target);
        if (e.key === "Backspace" && !target.value && index > 0) {
          inputs[index - 1].focus();
        }
        // preventDefault: otherwise the caret ALSO moves inside the box the
        // key just left, so the next typed character lands mid-value.
        if (e.key === "ArrowLeft" && index > 0) {
          e.preventDefault();
          inputs[index - 1].focus();
        }
        if (e.key === "ArrowRight" && index < inputs.length - 1) {
          e.preventDefault();
          inputs[index + 1].focus();
        }
      };

      const onPaste = (e: ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData?.getData("text") ?? "";
        const inputs = getInputs();
        const found = inputs.indexOf(e.target as HTMLInputElement);
        const startIdx = found === -1 ? 0 : found;
        [...text].forEach((char, i) => {
          const field = inputs[startIdx + i];
          if (!field) return;
          field.value = char;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          field.dispatchEvent(new Event("change", { bubbles: true }));
        });
        const lastFilled = Math.min(
          startIdx + text.length - 1,
          inputs.length - 1,
        );
        inputs[lastFilled]?.focus();
      };

      container.addEventListener("input", onInput);
      container.addEventListener("keydown", onKeydown as EventListener);
      container.addEventListener("paste", onPaste as EventListener);

      node.addHook("Remove", () => {
        container.removeEventListener("input", onInput);
        container.removeEventListener("keydown", onKeydown as EventListener);
        container.removeEventListener("paste", onPaste as EventListener);
      });
    },
  };
}

export { inputOTP };
