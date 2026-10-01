import common from "./common";
import features from "./features";
import gameModes from "./gameModes";
import library from "./library";
import migration from "./migration";
import settings from "./settings";
import site from "./site";
import triggers from "./triggers";
import whatsNew from "./whatsNew";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  common,
  features,
  gameModes,
  library,
  migration,
  settings,
  site,
  triggers,
  whatsNew,
} satisfies Translation<typeof en>;
