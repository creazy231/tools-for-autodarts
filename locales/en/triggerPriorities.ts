/**
 * The order a feature's triggers count in (utils/game-events/priorities.ts),
 * edited in the Caller, Sound FX, WLED and Animations panels with
 * components/Settings/Library/PriorityOrderField.vue. Each panel says in its own
 * file what the order does for it (`caller.priority`, `soundFx.priority`, …).
 * The trigger names shown beside a level (`gameshot`, `t20`) are what is typed,
 * and are never translated.
 */
export default {
  /** The row's title in the four panels, and the editor's heading. */
  title: "Priority",
  /** The row's button, spoken. `summary` is one of the two messages below. */
  buttonLabel: "Priority: {summary}",
  /** What the row's button says. */
  summary: {
    standard: "Default",
    custom: "Custom",
  },
  /** Under the panel's own intro: how the list is used. */
  howTo: "Higher up wins when several triggers fit the same moment. Drag a row, or use its arrows.",
  /** A row's arrow buttons, spoken. `level` is the row's name. */
  moveUp: "Move {level} up",
  moveDown: "Move {level} down",
  reset: "Reset to default",
  /** The rows. A row stands for a kind of trigger. */
  levels: {
    matchshot: "Match shot",
    gameshot: "Game shot",
    busted: "Bust",
    playerName: "Player's name",
    nextPlayer: "Next player",
    gameon: "Start of a leg",
    combo: "Darts of the visit",
    total: "Visit total",
    checkout: "Checkout call",
    checkoutCommon: "Checkout call in parts",
    variant: "Game-specific",
    dart: "Single dart",
    thrower: "Bot's or opponent's dart",
  },
  /** The line under each row. */
  hints: {
    matchshot: "The dart that wins the match",
    gameshot: "The dart that wins a leg",
    busted: "A bust, or a checkout that Teams' partner rule takes back",
    playerName: "Whoever is up, by name, and the winner after a match shot",
    nextPlayer: "A new visit when there is nothing for the name",
    gameon: "The start of a leg, and of the bull-off",
    combo: "The three darts of a visit together",
    total: "What a visit scored",
    checkout: "What is left to check out, in one call",
    checkoutCommon: "What is left, called in two parts",
    variant: "A lucky number left (111, 333), Cricket's hit or miss, a practice game's target, Gotcha, Killer",
    dart: "Each dart, and what stands in for one there is nothing for",
    thrower: "A dart by a bot, or by an opponent on another board",
  },
};
