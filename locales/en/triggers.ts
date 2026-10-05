/**
 * What the trigger field suggests as it is typed into: utils/trigger-catalog.ts,
 * shown by components/Settings/Library/TriggerField.vue and UploadDialog.vue.
 * Each line says when its trigger goes off. The trigger names themselves
 * (`gameshot`, `ambient_busted`) are what is typed, so they are never
 * translated, and they stay as they are inside a sentence.
 */
export default {
  /** The link over the field to the README's full list. */
  allTriggers: "All triggers",
  /** The one line under the field for the pattern-shaped triggers. Its tokens (`s20_s5_s1`, `range_100_180`, `target7`, `ambient_`) and number ranges stay as they are. */
  patterns: {
    caller: "Also scores 0–180, ranges like 100-180, s1–s20, d1–d20, t1–t20, combinations like s20_s5_s1, and a player's or team's name.",
    soundFx: "Also scores 0–180, ranges like 100-180, s/d/t1–20, combinations like s20_t19_d12 and a player's or team's name, each with or without ambient_.",
    wled: "Also scores 0–180, range_100_180, s/d/t1–20, m1–m20, combinations like t20_t20_t20, target7, and a player's or team's name.",
    animations: "Also scores 0–180, ranges like 100-180, s0–s20, d1–d20, t1–t20, and combinations like s20_s5_d20 or miss_s20_d20, where miss matches any missed dart.",
  },
  /** The board's events, one set for every feature: Sound FX offers them with `ambient_` in front. */
  board: {
    boardStarted: "The board has started",
    boardStopped: "The board has stopped or disconnected",
    manualResetDone: "After a manual reset, and when a new round starts",
    takeoutFinished: "Takeout has finished",
    calibrationStarted: "Calibration has started",
    calibrationFinished: "Calibration has finished",
  },
  /** Cricket's two triggers, offered by the Caller and Sound FX. */
  cricket: {
    hit: "Cricket: a hit on a target that is still open",
    miss: "Cricket: any other number, or a target everyone has closed",
  },
  caller: {
    gameon: "At the start of a new game",
    gameshot: "A player wins the leg",
    busted: "A player busts",
    /** `busted` is a trigger name: it stays as it is. */
    partnerRule: "Teams' partner rule takes a checkout back (busted when there is no sound for it)",
    youRequire: "Before a checkout is called",
    nextPlayer: "The next player is up and has no sound of their own",
    bot: "Instead of the name when a bot is up",
    bulloff: "Once, when the bull-off begins",
    bull: "A bullseye",
    outside: "A dart outside the scoring area",
    double: "Said before a double",
    triple: "Said before a triple",
  },
  soundFx: {
    ambientGameon: "At the start of a new game",
    ambientGameshot: "A player wins the leg",
    ambientMatchshot: "A player wins the match",
    ambientBusted: "A player busts",
    /** `ambient_busted` is a trigger name: it stays as it is. */
    ambientPartnerRule: "Teams' partner rule takes a checkout back (ambient_busted when there is no sound for it)",
    ambientBull: "A bullseye",
    ambientMiss: "A missed dart",
    /** `ambient_miss` is a trigger name: it stays as it is. */
    ambientOutside: "A missed dart, when there is no ambient_miss",
    ambientNextPlayer: "The next player is up and has no sound of their own",
    ambientBot: "A bot is up",
    botThrow: "A bot throws a dart",
    opponentThrow: "An opponent on another board throws a dart",
    ambientLobbyIn: "A player joins the lobby",
    ambientLobbyOut: "A player leaves the lobby",
    /** "Mark ready" is the tournament page's own button. */
    ambientTournamentReady: "A tournament match of yours is ready to mark ready",
  },
  wled: {
    gameon: "At the start of each turn, and when nothing else matches",
    takeout: "While takeout is in progress",
    gameshot: "A player wins the leg",
    matchshot: "A player wins the match",
    busted: "A player busts",
    /** `busted` is a trigger name: it stays as it is. */
    partnerRule: "Teams' partner rule takes a checkout back (busted when there is no effect for it)",
    bulloff: "Once, when the bull-off begins",
    idle: "Leaving the match",
    bull: "A bullseye",
    outside: "Any missed dart, when there is no effect on the miss itself",
    /** "Miss" is the site's keypad button, "bouncer" its correction. */
    miss: "A dart entered with Miss, or corrected to a bouncer",
    throw: "A dart is detected",
    lastThrow: "The last dart of a visit is detected",
    boardStarting: "The board is about to start",
    boardStopping: "The board is about to stop",
    botThrow: "A bot throws a dart",
    lobbyIn: "A player joins the lobby",
    lobbyOut: "A player leaves the lobby",
    /** "Mark ready" is the tournament page's own button. */
    tournamentReady: "A tournament match of yours is ready to mark ready",
    /**
     * "Boards" is the name of the WLED panel's list of boards. The trigger is `other`,
     * but a key called `other` would make this whole group look like a plural.
     */
    otherBoards: "Throws on a board that isn't in your Boards list",
  },
  animations: {
    gameshot: "A player wins the leg",
    matchshot: "A player wins the match",
    busted: "A player busts",
    bull: "A bullseye",
    s25: "The single bull",
    outside: "A dart outside the scoring area",
  },
};
