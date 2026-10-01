import common from "./common";
import features from "./features";
import migration from "./migration";
import settings from "./settings";
import site from "./site";
import whatsNew from "./whatsNew";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  common,
  features,
  migration,
  settings,
  site,
  whatsNew,
} satisfies Translation<typeof en>;
