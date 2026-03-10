import * as domphyCore from "@domphy/core";
import * as domphyUI from "@domphy/ui";
import * as domphyTheme from "@domphy/theme";
import * as queryCore from "@tanstack/query-core";
import i18next from "i18next";
import page from "page";
import Sortable from "sortablejs";
import * as zod from "zod";

const moduleMap: Record<string, unknown> = {
  "@domphy/core": domphyCore,
  "@domphy/ui": domphyUI,
  "@domphy/theme": domphyTheme,
  "@tanstack/query-core": queryCore,
  i18next,
  page,
  sortablejs: Sortable,
  zod,
};

export { moduleMap };
