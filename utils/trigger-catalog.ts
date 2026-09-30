/**
 * The named triggers each feature knows, with a line on when each goes off:
 * what the trigger field suggests as it is typed into. Taken from the README,
 * which stays the full reference. Numbers, segments and combinations follow
 * patterns, so they are summed up in one line instead of listed.
 */

export type TriggerFeature = "caller" | "soundFx" | "wled" | "animations";

export interface TriggerHint {
  trigger: string;
  description: string;
}

const README = "https://github.com/creazy231/tools-for-autodarts?tab=readme-ov-file";

/** The README section with the full list, per feature. */
export const TRIGGER_DOCS: Record<TriggerFeature, string> = {
  caller: `${README}#%EF%B8%8F-caller-feature`,
  soundFx: `${README}#-sound-fx-feature`,
  wled: `${README}#-wled-integration`,
  animations: `${README}#-animations`,
};

/** The pattern-shaped triggers, in one line. */
export const TRIGGER_PATTERNS: Record<TriggerFeature, string> = {
  caller: "Also scores 0–180, ranges like 100-180, s1–s20, d1–d20, t1–t20, combinations like s20_s5_s1, and a player's or team's name.",
  soundFx: "Also scores 0–180, ranges like 100-180, s/d/t1–20, combinations like s20_t19_d12 and a player's or team's name, each with or without ambient_.",
  wled: "Also scores 0–180, range_100_180, s/d/t1–20, m1–m20, combinations like t20_t20_t20, target7, and a player's or team's name.",
  animations: "Also scores 0–180, ranges like 100-180, s0–s20, d1–d20, t1–t20, and combinations like s20_s5_d20.",
};

function board(prefix = ""): TriggerHint[] {
  return [
    { trigger: `${prefix}board_started`, description: "The board has started" },
    { trigger: `${prefix}board_stopped`, description: "The board has stopped or disconnected" },
    { trigger: `${prefix}manual_reset_done`, description: "After a manual reset, and when a new round starts" },
    { trigger: `${prefix}takeout_finished`, description: "Takeout has finished" },
    { trigger: `${prefix}calibration_started`, description: "Calibration has started" },
    { trigger: `${prefix}calibration_finished`, description: "Calibration has finished" },
  ];
}

const CRICKET: TriggerHint[] = [
  { trigger: "cricket_hit", description: "Cricket: a hit on a target that is still open" },
  { trigger: "cricket_miss", description: "Cricket: any other number, or a target everyone has closed" },
];

export const TRIGGER_HINTS: Record<TriggerFeature, TriggerHint[]> = {
  caller: [
    { trigger: "gameon", description: "At the start of a new game" },
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "partner_rule", description: "Teams' partner rule takes a checkout back (busted when there is no sound for it)" },
    { trigger: "you_require", description: "Before a checkout is called" },
    { trigger: "next_player", description: "The next player is up and has no sound of their own" },
    { trigger: "bot", description: "Instead of the name when a bot is up" },
    { trigger: "bulloff", description: "Once, when the bull-off begins" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "outside", description: "A dart outside the scoring area" },
    { trigger: "double", description: "Said before a double" },
    { trigger: "triple", description: "Said before a triple" },
    ...CRICKET,
    ...board(),
  ],
  soundFx: [
    { trigger: "ambient_gameon", description: "At the start of a new game" },
    { trigger: "ambient_gameshot", description: "A player wins the leg" },
    { trigger: "ambient_matchshot", description: "A player wins the match" },
    { trigger: "ambient_busted", description: "A player busts" },
    { trigger: "ambient_partner_rule", description: "Teams' partner rule takes a checkout back (ambient_busted when there is no sound for it)" },
    { trigger: "ambient_bull", description: "A bullseye" },
    { trigger: "ambient_miss", description: "A missed dart" },
    { trigger: "ambient_outside", description: "A missed dart, when there is no ambient_miss" },
    { trigger: "ambient_next_player", description: "The next player is up and has no sound of their own" },
    { trigger: "ambient_bot", description: "A bot is up" },
    { trigger: "bot_throw", description: "A bot throws a dart" },
    { trigger: "opponent_throw", description: "An opponent on another board throws a dart" },
    { trigger: "ambient_lobby_in", description: "A player joins the lobby" },
    { trigger: "ambient_lobby_out", description: "A player leaves the lobby" },
    { trigger: "ambient_tournament_ready", description: "A tournament match of yours is ready to mark ready" },
    ...CRICKET,
    ...board("ambient_"),
  ],
  wled: [
    { trigger: "gameon", description: "At the start of each turn, and when nothing else matches" },
    { trigger: "takeout", description: "While takeout is in progress" },
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "matchshot", description: "A player wins the match" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "partner_rule", description: "Teams' partner rule takes a checkout back (busted when there is no effect for it)" },
    { trigger: "bulloff", description: "Once, when the bull-off begins" },
    { trigger: "idle", description: "Leaving the match" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "outside", description: "Any missed dart, when there is no effect on the miss itself" },
    { trigger: "miss", description: "A dart entered with Miss, or corrected to a bouncer" },
    { trigger: "throw", description: "A dart is detected" },
    { trigger: "last_throw", description: "The last dart of a visit is detected" },
    { trigger: "board_starting", description: "The board is about to start" },
    { trigger: "board_stopping", description: "The board is about to stop" },
    ...board(),
    { trigger: "bot_throw", description: "A bot throws a dart" },
    { trigger: "lobby_in", description: "A player joins the lobby" },
    { trigger: "lobby_out", description: "A player leaves the lobby" },
    { trigger: "tournament_ready", description: "A tournament match of yours is ready to mark ready" },
    { trigger: "other", description: "Throws on a board that isn't in your Boards list" },
  ],
  animations: [
    { trigger: "gameshot", description: "A player wins the leg" },
    { trigger: "busted", description: "A player busts" },
    { trigger: "bull", description: "A bullseye" },
    { trigger: "s25", description: "The single bull" },
    { trigger: "outside", description: "A dart outside the scoring area" },
  ],
};
