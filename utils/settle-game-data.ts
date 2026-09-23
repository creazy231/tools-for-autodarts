import type { IGameData } from "./game-data-storage";

export interface GameDataSettler {
  /** Hand over an update as storage delivers it. */
  push: (gameData: IGameData, oldGameData: IGameData) => void;
  /** Drop whatever is waiting without acting on it. */
  cancel: () => void;
}

/**
 * The wait between a game-data update and acting on it, for the features that
 * call out what just happened — the Caller, Sound FX and WLED.
 *
 * The same dart is often reported more than once while it settles: a
 * correction passes through several updates, and a merge of `activated` lands
 * on top of a state that is already stored. Acting on each would call the dart
 * each time, so every update restarts a short wait and only the newest is acted
 * on. That much is unchanged.
 *
 * What went wrong is what "the newest" was allowed to replace. The next
 * player's turn arriving before the wait was over took the finished visit's
 * place, and that visit was never called. On paper 200 ms leaves plenty of
 * room, but a timer's delay is only a request: Firefox holds timers in a tab
 * that is hidden and silent to a second at the least, so a visit handed over
 * within a second of its third dart — a quick Next — went uncalled whenever
 * no sound happened to be playing at the time (#249). A new dart replaced the
 * one before it the same way, which Call Every Dart hears.
 *
 * So an update now only ever replaces one about the same dart of the same
 * visit; anything else first acts on what was waiting, whatever the clock
 * says. That can hand over a state already acted on — the server sends a
 * finished visit again, `finishedAt` and all, a moment before the next turn —
 * so a state is never acted on twice in a row.
 */
export function settleGameData(act: (gameData: IGameData, oldGameData: IGameData) => void, delayMs: number = 200): GameDataSettler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting: { gameData: IGameData; oldGameData: IGameData } | null = null;
  let actedOn: string | undefined;

  function flush(): void {
    if (timer) clearTimeout(timer);
    timer = null;

    const next = waiting;
    waiting = null;
    if (!next) return;

    const seen = whatHappened(next.gameData);
    if (seen === actedOn) return;
    actedOn = seen;

    act(next.gameData, next.oldGameData);
  }

  return {
    push(gameData, oldGameData) {
      if (waiting && moment(waiting.gameData) !== moment(gameData)) flush();

      waiting = { gameData, oldGameData };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      waiting = null;
    },
  };
}

/** Which dart of which visit an update is about. Only these may replace each other. */
function moment(gameData: IGameData): string {
  const match = gameData?.match;
  const turn = match?.turns?.[0];
  return [ match?.id, match?.set, match?.leg, match?.round, match?.player, turn?.id, turn?.throws?.length ?? 0 ].join("|");
}

/**
 * Everything the features decide on, and none of the timestamps the server
 * stamps again when it repeats itself.
 */
function whatHappened(gameData: IGameData): string {
  const match = gameData?.match;
  if (!match) return "";

  const turn = match.turns?.[0];
  return JSON.stringify([
    match.id,
    match.variant,
    match.set,
    match.leg,
    match.round,
    match.player,
    match.activated,
    match.gameWinner,
    match.winner,
    match.gameScores,
    (match as { state?: { checkoutGuide?: unknown } }).state?.checkoutGuide,
    turn && [ turn.id, turn.playerId, turn.points, turn.score, turn.busted, turn.marks, turn.throws?.map(dart => [ dart.id, dart.segment?.name, dart.segment?.bed ]) ],
  ]);
}
