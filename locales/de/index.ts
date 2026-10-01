import common from "./common";
import features from "./features";
import settings from "./settings";
import site from "./site";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  common,
  features,
  settings,
  site,
} satisfies Translation<typeof en>;
