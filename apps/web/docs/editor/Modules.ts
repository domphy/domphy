import * as domphyApp from "@domphy/app";
import * as domphyChart from "@domphy/chart";
import * as domphyCore from "@domphy/core";
import * as domphyDnd from "@domphy/dnd";
import * as domphyForm from "@domphy/form/domphy";
import * as domphyI18n from "@domphy/i18n";
import * as domphyQuery from "@domphy/query";
import * as domphyQueryDomphy from "@domphy/query/domphy";
import * as domphyRouter from "@domphy/router";
import * as domphyTable from "@domphy/table";
import * as domphyTableDomphy from "@domphy/table/domphy";
import * as domphyTheme from "@domphy/theme";
import * as domphyUI from "@domphy/ui";
import * as domphyVirtual from "@domphy/virtual/domphy";
import * as queryCore from "@tanstack/query-core";
import page from "page";
import Sortable from "sortablejs";
import * as zod from "zod";

const moduleMap: Record<string, unknown> = {
  "@domphy/chart": domphyChart,
  "@domphy/core": domphyCore,
  "@domphy/ui": domphyUI,
  "@domphy/theme": domphyTheme,
  "@domphy/query": domphyQuery,
  "@domphy/query/domphy": domphyQueryDomphy,
  "@domphy/router": domphyRouter,
  "@domphy/table": domphyTable,
  "@domphy/table/domphy": domphyTableDomphy,
  "@domphy/app": domphyApp,
  "@domphy/i18n": domphyI18n,
  "@domphy/dnd": domphyDnd,
  "@domphy/form/domphy": domphyForm,
  "@domphy/virtual/domphy": domphyVirtual,
  "@tanstack/query-core": queryCore,
  page,
  sortablejs: Sortable,
  zod,
};

export { moduleMap };
