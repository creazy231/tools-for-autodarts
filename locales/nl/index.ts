import autoStart from "./autoStart";
import automaticFullscreen from "./automaticFullscreen";
import automaticNextLeg from "./automaticNextLeg";
import common from "./common";
import discordWebhooks from "./discordWebhooks";
import enhancedScoringDisplay from "./enhancedScoringDisplay";
import features from "./features";
import gameModes from "./gameModes";
import gotcha from "./gotcha";
import largerLegsSets from "./largerLegsSets";
import largerPlayerMatchData from "./largerPlayerMatchData";
import largerPlayerNames from "./largerPlayerNames";
import library from "./library";
import localLobby from "./localLobby";
import migration from "./migration";
import nextPlayerOnTakeoutStuck from "./nextPlayerOnTakeoutStuck";
import qrCode from "./qrCode";
import recentLocalPlayers from "./recentLocalPlayers";
import settings from "./settings";
import site from "./site";
import smallerScores from "./smallerScores";
import takeoutNotification from "./takeoutNotification";
import teams from "./teams";
import triggers from "./triggers";
import whatsNew from "./whatsNew";
import winnerAnimation from "./winnerAnimation";

import type en from "../en";
import type { Translation } from "../../utils/i18n/types";

export default {
  autoStart,
  automaticFullscreen,
  automaticNextLeg,
  common,
  discordWebhooks,
  enhancedScoringDisplay,
  features,
  gameModes,
  gotcha,
  largerLegsSets,
  largerPlayerMatchData,
  largerPlayerNames,
  library,
  localLobby,
  migration,
  nextPlayerOnTakeoutStuck,
  qrCode,
  recentLocalPlayers,
  settings,
  site,
  smallerScores,
  takeoutNotification,
  teams,
  triggers,
  whatsNew,
  winnerAnimation,
} satisfies Translation<typeof en>;
