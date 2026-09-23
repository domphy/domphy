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
      $: [buttonSwitch({ checked: wifi })],
    }),
    row("Notifications", {
      button: [{ span: null }],
      $: [buttonSwitch({ checked: notifications, accentColor: "secondary" })],
    }),
    row("Dark mode", {
      button: [{ span: null }],
      $: [buttonSwitch({ checked: darkMode, accentColor: "primary" })],
    }),
    row("Disabled on", {
      button: [{ span: null }],
      disabled: true,
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
