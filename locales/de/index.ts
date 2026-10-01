import autoStart from "./autoStart";
import common from "./common";
import discordWebhooks from "./discordWebhooks";
import features from "./features";
import gameModes from "./gameModes";
import library from "./library";
import localLobby from "./localLobby";
import migration from "./migration";
import qrCode from "./qrCode";
import recentLocalPlayers from "./recentLocalPlayers";
import settings from "./settings";
import site from "./site";
import triggers from "./triggers";
import whatsNew from "./whatsNew";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  autoStart,
  common,
  discordWebhooks,
  features,
  gameModes,
  library,
  localLobby,
  migration,
  qrCode,
  recentLocalPlayers,
  settings,
  site,
  triggers,
  whatsNew,
} satisfies Translation<typeof en>;
