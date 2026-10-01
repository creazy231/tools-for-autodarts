import common from "./common";
import site from "./site";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  common,
  site,
} satisfies Translation<typeof en>;
