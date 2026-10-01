/**
 * The named triggers each feature knows, with a line on when each goes off:
 * what the trigger field suggests as it is typed into. Taken from the README,
 * which stays the full reference. Numbers, segments and combinations follow
 * patterns, so they are summed up in one line instead of listed.
 *
 * The lines are message keys (locales/en/triggers.ts and its translations),
 * not text: the field turns them into the language shown with `t()`, so this
 * module never does. The triggers themselves are what is typed, and are the
 * same in every language.
 */

import type { MessageKey } from "@/utils/i18n";

export type TriggerFeature = "caller" | "soundFx" | "wled" | "animations";

export interface TriggerHint {
  trigger: string;
  descriptionKey: MessageKey;
}

const README = "https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file";

/** The README section with the full list, per feature. */
export const TRIGGER_DOCS: Record<TriggerFeature, string> = {
  caller: `${README}#%EF%B8%8F-caller-feature`,
  soundFx: `${README}#-sound-fx-feature`,
  wled: `${README}#-wled-integration`,
  animations: `${README}#-animations`,
};

/** The pattern-shaped triggers, in one line each. */
export const TRIGGER_PATTERN_KEYS: Record<TriggerFeature, MessageKey> = {
  caller: "triggers.patterns.caller",
  soundFx: "triggers.patterns.soundFx",
  wled: "triggers.patterns.wled",
  animations: "triggers.patterns.animations",
};

function board(prefix = ""): TriggerHint[] {
  return [
    { trigger: `${prefix}board_started`, descriptionKey: "triggers.board.boardStarted" },
    { trigger: `${prefix}board_stopped`, descriptionKey: "triggers.board.boardStopped" },
    { trigger: `${prefix}manual_reset_done`, descriptionKey: "triggers.board.manualResetDone" },
    { trigger: `${prefix}takeout_finished`, descriptionKey: "triggers.board.takeoutFinished" },
    { trigger: `${prefix}calibration_started`, descriptionKey: "triggers.board.calibrationStarted" },
    { trigger: `${prefix}calibration_finished`, descriptionKey: "triggers.board.calibrationFinished" },
  ];
}

const CRICKET: TriggerHint[] = [
  { trigger: "cricket_hit", descriptionKey: "triggers.cricket.hit" },
  { trigger: "cricket_miss", descriptionKey: "triggers.cricket.miss" },
];

export const TRIGGER_HINTS: Record<TriggerFeature, TriggerHint[]> = {
  caller: [
    { trigger: "gameon", descriptionKey: "triggers.caller.gameon" },
    { trigger: "gameshot", descriptionKey: "triggers.caller.gameshot" },
    { trigger: "busted", descriptionKey: "triggers.caller.busted" },
    { trigger: "partner_rule", descriptionKey: "triggers.caller.partnerRule" },
    { trigger: "you_require", descriptionKey: "triggers.caller.youRequire" },
    { trigger: "next_player", descriptionKey: "triggers.caller.nextPlayer" },
    { trigger: "bot", descriptionKey: "triggers.caller.bot" },
    { trigger: "bulloff", descriptionKey: "triggers.caller.bulloff" },
    { trigger: "bull", descriptionKey: "triggers.caller.bull" },
    { trigger: "outside", descriptionKey: "triggers.caller.outside" },
    { trigger: "double", descriptionKey: "triggers.caller.double" },
    { trigger: "triple", descriptionKey: "triggers.caller.triple" },
    ...CRICKET,
    ...board(),
  ],
  soundFx: [
    { trigger: "ambient_gameon", descriptionKey: "triggers.soundFx.ambientGameon" },
    { trigger: "ambient_gameshot", descriptionKey: "triggers.soundFx.ambientGameshot" },
    { trigger: "ambient_matchshot", descriptionKey: "triggers.soundFx.ambientMatchshot" },
    { trigger: "ambient_busted", descriptionKey: "triggers.soundFx.ambientBusted" },
    { trigger: "ambient_partner_rule", descriptionKey: "triggers.soundFx.ambientPartnerRule" },
    { trigger: "ambient_bull", descriptionKey: "triggers.soundFx.ambientBull" },
    { trigger: "ambient_miss", descriptionKey: "triggers.soundFx.ambientMiss" },
    { trigger: "ambient_outside", descriptionKey: "triggers.soundFx.ambientOutside" },
    { trigger: "ambient_next_player", descriptionKey: "triggers.soundFx.ambientNextPlayer" },
    { trigger: "ambient_bot", descriptionKey: "triggers.soundFx.ambientBot" },
    { trigger: "bot_throw", descriptionKey: "triggers.soundFx.botThrow" },
    { trigger: "opponent_throw", descriptionKey: "triggers.soundFx.opponentThrow" },
    { trigger: "ambient_lobby_in", descriptionKey: "triggers.soundFx.ambientLobbyIn" },
    { trigger: "ambient_lobby_out", descriptionKey: "triggers.soundFx.ambientLobbyOut" },
    { trigger: "ambient_tournament_ready", descriptionKey: "triggers.soundFx.ambientTournamentReady" },
    ...CRICKET,
    ...board("ambient_"),
  ],
  wled: [
    { trigger: "gameon", descriptionKey: "triggers.wled.gameon" },
    { trigger: "takeout", descriptionKey: "triggers.wled.takeout" },
    { trigger: "gameshot", descriptionKey: "triggers.wled.gameshot" },
    { trigger: "matchshot", descriptionKey: "triggers.wled.matchshot" },
    { trigger: "busted", descriptionKey: "triggers.wled.busted" },
    { trigger: "partner_rule", descriptionKey: "triggers.wled.partnerRule" },
    { trigger: "bulloff", descriptionKey: "triggers.wled.bulloff" },
    { trigger: "idle", descriptionKey: "triggers.wled.idle" },
    { trigger: "bull", descriptionKey: "triggers.wled.bull" },
    { trigger: "outside", descriptionKey: "triggers.wled.outside" },
    { trigger: "miss", descriptionKey: "triggers.wled.miss" },
    { trigger: "throw", descriptionKey: "triggers.wled.throw" },
    { trigger: "last_throw", descriptionKey: "triggers.wled.lastThrow" },
    { trigger: "board_starting", descriptionKey: "triggers.wled.boardStarting" },
    { trigger: "board_stopping", descriptionKey: "triggers.wled.boardStopping" },
    ...board(),
    { trigger: "bot_throw", descriptionKey: "triggers.wled.botThrow" },
    { trigger: "lobby_in", descriptionKey: "triggers.wled.lobbyIn" },
    { trigger: "lobby_out", descriptionKey: "triggers.wled.lobbyOut" },
    { trigger: "tournament_ready", descriptionKey: "triggers.wled.tournamentReady" },
    { trigger: "other", descriptionKey: "triggers.wled.otherBoards" },
  ],
  animations: [
    { trigger: "gameshot", descriptionKey: "triggers.animations.gameshot" },
    { trigger: "busted", descriptionKey: "triggers.animations.busted" },
    { trigger: "bull", descriptionKey: "triggers.animations.bull" },
    { trigger: "s25", descriptionKey: "triggers.animations.s25" },
    { trigger: "outside", descriptionKey: "triggers.animations.outside" },
  ],
};
