import { type PartialElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";

function inputOTP(): PartialElement {
    return {
        style: {
            display: "flex",
            alignItems: "center",
            gap: themeSpacing(2),
            "& > *":{
                minWidth:themeSpacing(9) + "!important",
            }
        },
        _onMount: (node) => {
            const container = node.domElement as HTMLElement;
            const getInputs = () => Array.from(container.querySelectorAll("input")) as HTMLInputElement[];

            const onInput = (e: Event) => {
                const inputs = getInputs();
                const target = e.target as HTMLInputElement;
                const idx = inputs.indexOf(target);
                if (target.value && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
            };

            const onKeydown = (e: KeyboardEvent) => {
                const inputs = getInputs();
                const target = e.target as HTMLInputElement;
                const idx = inputs.indexOf(target);
                if (e.key === "Backspace" && !target.value && idx > 0) {
                    inputs[idx - 1].focus();
                }
                if (e.key === "ArrowLeft" && idx > 0) inputs[idx - 1].focus();
                if (e.key === "ArrowRight" && idx < inputs.length - 1) inputs[idx + 1].focus();
            };

            const onPaste = (e: ClipboardEvent) => {
                e.preventDefault();
                const text = e.clipboardData?.getData("text") ?? "";
                const inputs = getInputs();
                const startIdx = inputs.indexOf(e.target as HTMLInputElement);
                [...text].forEach((char, i) => {
                    if (inputs[startIdx + i]) inputs[startIdx + i].value = char;
                });
                const lastFilled = Math.min(startIdx + text.length - 1, inputs.length - 1);
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
