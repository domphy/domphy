import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { buttonSwitch, small } from "@domphy/ui";

const wifi = toState(true);
const notifications = toState(false);
const darkMode = toState(true);

function row(label: string, element: DomphyElement): DomphyElement<"div"> {
  return {
    div: [{ small: label, $: [small()] }, element],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: themeSpacing(8),
    },
  };
}

const App: DomphyElement<"div"> = {
  div: [
    row("Wi-Fi", {
      button: [{ span: null }],
      // Toggle thumb has no text content — buttonSwitch's own tones convey state.
      _doctorDisable: "missing-color",
      $: [buttonSwitch({ checked: wifi })],
    }),
    row("Notifications", {
      button: [{ span: null }],
      // Toggle thumb has no text content — buttonSwitch's own tones convey state.
      _doctorDisable: "missing-color",
      $: [buttonSwitch({ checked: notifications, accentColor: "secondary" })],
    }),
    row("Dark mode", {
      button: [{ span: null }],
      // Toggle thumb has no text content — buttonSwitch's own tones convey state.
      _doctorDisable: "missing-color",
      $: [buttonSwitch({ checked: darkMode, accentColor: "primary" })],
    }),
    row("Disabled on", {
      button: [{ span: null }],
      disabled: true,
      // Toggle thumb has no text content — buttonSwitch's own tones convey state.
      _doctorDisable: "missing-color",
      $: [buttonSwitch({ checked: true })],
    }),
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
    maxWidth: themeSpacing(60),
  },
};

export default App;
