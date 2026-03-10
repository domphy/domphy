import { toState, type DomphyElement } from "@domphy/core";
import { button } from "@domphy/ui";
import i18next from "i18next";

const lang = toState("en");
const ready = toState(false);

async function initI18next() {
  if (ready.get()) return;

  await i18next.init({
    lng: "en",
    resources: {
      en: {
        translation: {
          greeting: "Hello, {{name}}!",
          description: "Welcome to Domphy",
          switchLang: "Switch to Vietnamese",
        },
      },
      vi: {
        translation: {
          greeting: "Xin chao, {{name}}!",
          description: "Chao mung den voi Domphy",
          switchLang: "Switch to English",
        },
      },
    },
  });

  lang.set(i18next.language);
  ready.set(true);
}

function changeLang(lng: string) {
  void i18next.changeLanguage(lng).then(() => lang.set(lng));
}

function translate(listener: any, key: string, options?: object) {
  lang.get(listener);
  if (!ready.get(listener)) return "Loading...";
  return i18next.t(key, options);
}

const App: DomphyElement<"div"> = {
  div: [
    {
      h1: (listener) => translate(listener, "greeting", { name: "Dev" }),
    },
    {
      p: (listener) => translate(listener, "description"),
    },
    {
      button: (listener) => translate(listener, "switchLang"),
      onClick: () => changeLang(i18next.language === "en" ? "vi" : "en"),
      disabled: (listener) => !ready.get(listener),
      $: [button()],
    },
  ],
  _onMount: () => {
    void initI18next();
  },
};

export default App;
