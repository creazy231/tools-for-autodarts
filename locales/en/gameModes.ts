/**
 * The games the Caller, Sound FX, WLED and Animations can each be kept to:
 * utils/game-modes.ts, shown by components/Settings/Library/GameModesField.vue.
 * The names of the games and of their groups are the site's own
 * (lobby.gamePicker.games.*, lobby.gameTypes.*), not ours: only these labels
 * are translated, the `GameMode` values behind them never are.
 */
export default {
  /** The editor's heading, and the title of the "Game modes" row in the four panels. */
  title: "Game modes",
  /** The row's button, spoken. `summary` is one of the three messages below. */
  buttonLabel: "Game modes: {summary}",
  /** What the row's button says, and what the editor's first switch is called ("All games"). */
  summary: {
    all: "All games",
    none: "None",
    /** `on` of the `total` games shown. */
    count: "{on} of {total}",
  },
  groups: {
    x01Cricket: "X01 and Cricket",
    practice: "Practice",
    party: "Party",
    beforeMatch: "Before a match",
  },
  modes: {
    x01: "X01",
    cricket: "Cricket / Tactics",
    countUp: "Count Up",
    atc: "Around The Clock",
    randomCheckout: "Random Checkout",
    rtw: "Round the World",
    segmentTraining: "Segment Training",
    bobs27: "Bob's 27",
    game121: "121",
    shanghai: "Shanghai",
    gotcha: "Gotcha",
    bermuda: "Bermuda",
    killer: "Killer",
    bullOff: "Bull-off",
  },
};
