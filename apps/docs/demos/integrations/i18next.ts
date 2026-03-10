import { toState, type DomphyElement } from "@domphy/core";
import { button } from "@domphy/ui";
import i18next from "i18next";
// --- i18next Setup (pure JS, no Domphy wrapper) ---
await i18next.init({
  lng: "en",
  resources: {
    en: {
      translation: {
        greeting: "Hello, {{name}}!",
        description: "Welcome to Domphy",
        switchLang: "Switch to Vietnamese"
      }
    },
    vi: {
      translation: {
        greeting: "Hello, {{name}}!",
        description: "Welcome to Domphy",
        switchLang: "Switch to English"
      }
    }
  }
});

// --- Language State (few lines to connect) ---
const lang = toState(i18next.language);

function changeLang(lng: string) {
  i18next.changeLanguage(lng, () => lang.set(lng));
}

// Create and export translate function to cross use entire app
function translate(listener: any, key: string, options?: object) {
  lang.get(listener); // subscribe to language changes
  return i18next.t(key, options);
}

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      h1: (listener) => translate(listener, "greeting", { name: "Dev" })
    },
    {
      p: (listener) => translate(listener, "description")
    },
    {
      button: (listener) => translate(listener, "switchLang"),
      onClick: () => changeLang(i18next.language === "en" ? "vi" : "en"),
      $:[ button()]
    }
  ]
};

export default App
