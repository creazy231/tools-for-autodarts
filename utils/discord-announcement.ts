/**
 * The words in a Discord Webhooks announcement for the lobby's settings.
 *
 * The message is written in the host's language, and each setting autodarts
 * itself has a label for is named the way the site names it in that language
 * (yarn i18n:site lobby.gameSettings.). A setting the site added since keeps
 * the humanised key the announcement always used, "maxRounds" → "Max Rounds",
 * and a value without a translation is shown as autodarts sent it. English is
 * word for word what the announcement said before it was translated.
 *
 * `translate` is `t` from @/utils/i18n, passed in so this stays pure.
 */

import type { MessageKey } from "@/utils/i18n";

import { GameMode } from "@/utils/game-modes";

type Translate = (key: MessageKey) => string;

const SETTING_KEYS: Record<string, MessageKey> = {
  baseScore: "discordWebhooks.settings.baseScore",
  bullMode: "discordWebhooks.settings.bullMode",
  bullOffMode: "discordWebhooks.settings.bullOffMode",
  inMode: "discordWebhooks.settings.inMode",
  legs: "discordWebhooks.settings.legs",
  maxPlayers: "discordWebhooks.settings.maxPlayers",
  maxRounds: "discordWebhooks.settings.maxRounds",
  outMode: "discordWebhooks.settings.outMode",
  sets: "discordWebhooks.settings.sets",
  targetScore: "discordWebhooks.settings.targetScore",
  variant: "discordWebhooks.settings.variant",
};

const IN_OUT_VALUES: Record<string, MessageKey> = {
  Straight: "discordWebhooks.values.inOutMode.Straight",
  Double: "discordWebhooks.values.inOutMode.Double",
  Master: "discordWebhooks.values.inOutMode.Master",
};

const BULL_OFF_VALUES: Record<string, MessageKey> = {
  Normal: "discordWebhooks.values.bullOffMode.Normal",
  Official: "discordWebhooks.values.bullOffMode.Official",
  Off: "discordWebhooks.values.bullOffMode.Off",
};

/**
 * The games, by the variant autodarts sends. English keeps that variant as the
 * announcement always showed it ("CountUp", "ATC"); German and Dutch use the
 * site's game names, the ones the game picker shows (gameModes.modes.*).
 */
const VARIANT_VALUES: Record<string, MessageKey> = {
  [GameMode.X01]: "discordWebhooks.values.variant.x01",
  [GameMode.CRICKET]: "discordWebhooks.values.variant.cricket",
  [GameMode.COUNT_UP]: "discordWebhooks.values.variant.countUp",
  [GameMode.ATC]: "discordWebhooks.values.variant.atc",
  [GameMode.RANDOM_CHECKOUT]: "discordWebhooks.values.variant.randomCheckout",
  [GameMode.RTW]: "discordWebhooks.values.variant.rtw",
  [GameMode.SEGMENT_TRAINING]: "discordWebhooks.values.variant.segmentTraining",
  [GameMode.BOBS_27]: "discordWebhooks.values.variant.bobs27",
  [GameMode.TRAINING_121]: "discordWebhooks.values.variant.game121",
  [GameMode.SHANGHAI]: "discordWebhooks.values.variant.shanghai",
  [GameMode.GOTCHA]: "discordWebhooks.values.variant.gotcha",
  [GameMode.BERMUDA]: "discordWebhooks.values.variant.bermuda",
  [GameMode.KILLER]: "discordWebhooks.values.variant.killer",
  [GameMode.BULL_OFF]: "discordWebhooks.values.variant.bullOff",
};

/** "maxRounds" → "Max Rounds": what the announcement always called a setting. */
export function humanise(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

/** The name of a lobby setting: the site's word for it, or the humanised key when the site has none. */
export function settingName(key: string, translate: Translate): string {
  const known = SETTING_KEYS[key];
  return known ? translate(known) : humanise(key);
}

/** The value of a lobby setting: translated when it is one the catalogs know, as autodarts sent it otherwise. */
export function settingValue(key: string, value: unknown, translate: Translate): string {
  const text = String(value);
  const table = key === "inMode" || key === "outMode"
    ? IN_OUT_VALUES
    : key === "bullOffMode"
      ? BULL_OFF_VALUES
      : key === "variant"
        ? VARIANT_VALUES
        : undefined;
  const known = table?.[text];
  return known ? translate(known) : text;
}
