import type { ILobbies, IMatch } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData, type IGameData } from "@/utils/game-data-storage";
import { pageVariant, playsIn } from "@/utils/game-modes";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { selectedBoard } from "@/utils/lobby-guests";
import { AutodartsToolsBoardData, type IBoard } from "@/utils/board-data-storage";
import { isPlayerUpInTheRoom } from "@/utils/own-board";
import { AutodartsToolsConfig, type IConfig, type IWled } from "@/utils/storage";
import { getUserIdFromToken, triggerPatterns } from "@/utils/helpers";
import { settleGameData } from "@/utils/settle-game-data";
import { legWinNames, loadTeamCalls, matchWinNames, turnNames } from "@/utils/team-calls";
import { isTournamentPage, watchTournamentReady } from "@/utils/tournament-ready";
import { gameDataProcessor, turnStartEffect } from "@/utils/wled";
import { type WledRequest, wledRequest } from "@/utils/wled-request";
import { winId } from "@/utils/win";

let gameDataWatcherUnwatch: any;
let lobbyDataWatcherUnwatch: any;
let boardDataWatcherUnwatch: any;
let tournamentReadyUnwatch: (() => void) | null = null;
let config: IConfig;

/**
 * Whether the player up throws in this room (utils/own-board.ts): you, a guest
 * or a bot you added, anyone at your board. While somebody elsewhere is up, an
 * online opponent say, an effect on `other` stands in for every effect, board
 * events included.
 *
 * Settled by every game message, and from the stored match as the page opens,
 * since board events can come first. True until a match says otherwise.
 */
let playerUpHere = true;

/** Your account, which tells your guests and bots: asked for until the access token has landed. */
let localUserId: string | null = null;

// Each game-data update settles before its effect is set, without a finished
// visit ever being lost to the next one — see utils/settle-game-data.ts.
const settled = settleGameData((gameData, oldGameData) => processGameData(gameData, oldGameData, true));

/**
 * The win the gameshot/matchshot effect was last set for — see {@link winId}.
 *
 * A won leg goes on being reported after the dart that won it, and Finish sends
 * it once more, so going by the winner alone set the effect again each time.
 */
let announcedWin: string | undefined;

/**
 * Whose name `{player}` and `{player_ascii}` stand for: the player up in the
 * last update acted on, so an effect a board event sets between two updates
 * gets it too. Empty where there is no match (a lobby, a board page), and once
 * the match is left.
 */
let turnPlayer = "";

/**
 * What was sent last, for *Don't restart a running effect* (`WledRequest.key`).
 * Forgotten whenever WLED starts on a page: the lights may have changed since,
 * from the lobby, another tab or the settings, so a page's first effect goes
 * out even when it is the one this script sent last.
 */
let lastRequest: string | undefined;

/**
 * The effect the turn up started with, and the turn it was chosen for, for
 * *Keep the player's effect between darts* (`wledFx.keepTurnEffect`). Chosen
 * once a turn and settled on one effect, so a player with more than one, or
 * more than one `next_player` effect, keeps the one their turn started with.
 * Forgotten whenever WLED starts on a page, as the effects may have changed.
 */
let turnEffect: { turn: string; effect: string | IWled } | undefined;

/** `/lobby/<id>` on the rebuilt site, `/lobbies/<id>` on the old one. */
function isOnALobbyPage(): boolean {
  return /\/lobb(?:y|ies)\//.test(window.location.href);
}

/**
 * Whether the player up in `match` throws in this room. One who can't be told
 * yet, a guest with no board before the access token has landed, counts as
 * here: `other` is for somebody known to be elsewhere.
 */
async function isPlayerUpHere(match: IMatch | undefined): Promise<boolean> {
  if (!localUserId) localUserId = await getUserIdFromToken();
  return isPlayerUpInTheRoom(match, localUserId, { url: window.location.href, selected: selectedBoard() }) !== false;
}

/**
 * A board event's effect. Board frames don't say which board sent them, so an
 * event belongs to whoever is up: while that is somebody elsewhere, `other` is
 * showing, and their takeout leaves it there. A lobby or a tournament page has
 * nobody up, whatever the last match left behind, so its events are yours.
 */
function eventTrigger(trigger: string) {
  if (!isTriggerPresent(trigger)) return;
  if (!playerUpHere && isTriggerPresent("other") && !isOnALobbyPage() && !isTournamentPage()) return;
  setEffectByTrigger(trigger);
}

async function checkStatus(boardData: IBoard): Promise<void> {
  const boardEvent: string | undefined = boardData.event;
  const boardStatus: string | undefined = boardData.status;

  console.log(`Autodarts Tools: WLED: Board: event '${boardEvent}', status '${boardStatus}'`);
  if ((boardEvent === "Starting" && (boardStatus === "" || boardStatus === "Starting")) ||
    (boardEvent === "start" && boardStatus === ""))
    eventTrigger("board_starting");
  else if (boardEvent === "Started" && boardStatus === "Throw")
    eventTrigger("board_started");
  else if (boardEvent === "Stopping" && boardStatus === "Stopping")
    eventTrigger("board_stopping");
  else if (boardEvent === "Stopped" && boardStatus === "Stopped")
    eventTrigger("board_stopped");
  else if (boardEvent === "Disconnected" && (boardStatus === "Offline" || boardStatus === ""))
    eventTrigger("board_stopped");
  else if (boardEvent === "Manual reset" && boardStatus === "Throw")
    eventTrigger("manual_reset_done");
  else if (boardEvent === "Throw detected" && boardStatus === "Throw")
    eventTrigger("throw");
  else if (boardEvent === "Throw detected" && boardStatus === "Takeout")
    eventTrigger("last_throw");
  else if (boardEvent === "Takeout started" && boardStatus === "Takeout in progress")
    eventTrigger("takeout");
  else if (boardEvent === "Takeout finished" && boardStatus === "Throw")
    eventTrigger("takeout_finished");
  else if (boardEvent === "Calibration started")
    eventTrigger("calibration_started");
  else if (boardEvent === "Calibration finished")
    eventTrigger("calibration_finished");
  else
    console.log(`Autodarts Tools: WLED: Board: event '${boardEvent}' with status '${boardStatus}' was unhandled`);
}

export async function wledFx() {
  console.log("Autodarts Tools: WLED: WLED FX");

  try {
    config = await AutodartsToolsConfig.getValue();
    lastRequest = undefined;
    turnEffect = undefined;
    await loadTeamCalls();
    const gameData = await AutodartsToolsGameData.getValue();
    console.log(`Autodarts Tools: WLED: Config loaded, ${config.wledFx?.effects?.length || 0} effects available`);

    // Board events can arrive before the first game message, so who is up is
    // settled up front: from the stored match on its own page, and nobody
    // elsewhere anywhere else. A lobby's stored match is the last one played.
    playerUpHere = pageVariant(gameData.match, window.location.href) === undefined
      || await isPlayerUpHere(gameData.match);

    if (!gameDataWatcherUnwatch) {
      gameDataWatcherUnwatch = AutodartsToolsGameData.watch(
        (gameData: IGameData, oldGameData: IGameData) => {
          if (!playsIn(config?.wledFx, gameData.match?.variant)) return;
          settled.push(gameData, oldGameData);
        },
      );

      const url = window.location.href;
      const matchId = url.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      )?.[0];

      if (gameData.match?.id === matchId && playsIn(config?.wledFx, gameData.match?.variant)) {
        processGameData(gameData, gameData);
      }
    }

    if (!lobbyDataWatcherUnwatch) {
      lobbyDataWatcherUnwatch = AutodartsToolsLobbyData.watch(
        async (_lobbyData: ILobbies | undefined, _oldLobbyData: ILobbies | undefined) => {
          if (!_lobbyData || !_oldLobbyData || !config.wledFx?.enabled) return;
          // The rebuilt site's lobby is `/lobby/<id>`. Matching only the old
          // spelling meant these two never fired on it.
          if (!isOnALobbyPage()) return;

          if (
            (_lobbyData.players?.length ?? 0) > (_oldLobbyData.players?.length ?? 0)
            && (_lobbyData.players?.length ?? 0) > 1
          ) {
            setEffectByTrigger("lobby_in");
          }

          if (
            (_lobbyData.players?.length ?? 0) < (_oldLobbyData.players?.length ?? 0)
            && (_lobbyData.players?.length ?? 0) > 0
          ) {
            setEffectByTrigger("lobby_out");
          }
        },
      );
    }

    if (!boardDataWatcherUnwatch) {
      boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(async (boardData: IBoard) => {
        // A board event follows the game of this page's own match: in a lobby the
        // stored match is the last one played, and its game says nothing here.
        const stored = await AutodartsToolsGameData.getValue();
        if (playsIn(config?.wledFx, pageVariant(stored?.match, window.location.href))) checkStatus(boardData).catch(e => console.error(e));
      });
    }

    // A tournament match of yours waiting for you to mark ready, the same
    // moment Sound FX plays `ambient_tournament_ready` on — see
    // utils/tournament-ready.ts. This used to be the tournament's `start`
    // event, which comes once, before the first round, and never for the
    // matches after it. Only a tournament's page draws the card, and the lobby
    // entrypoint starts this on lobbies as well, without a teardown in between,
    // so the watch follows the page it is on.
    if (isTournamentPage()) {
      if (!tournamentReadyUnwatch) {
        tournamentReadyUnwatch = watchTournamentReady(() => {
          if (!config.wledFx?.enabled) return;
          console.log("Autodarts Tools: WLED: Tournament match ready, triggering tournament_ready effect");
          setEffectByTrigger("tournament_ready");
        });
      }
    } else if (tournamentReadyUnwatch) {
      tournamentReadyUnwatch();
      tournamentReadyUnwatch = null;
    }
  } catch (error) {
    console.error("Autodarts Tools: WLED: wledFx initialization error", error);
  }
}

export function wledFxOnRemove() {
  console.log("Autodarts Tools: WLED: wledFx on remove");
  if (gameDataWatcherUnwatch) {
    gameDataWatcherUnwatch();
    gameDataWatcherUnwatch = null;
  }

  if (lobbyDataWatcherUnwatch) {
    lobbyDataWatcherUnwatch();
    lobbyDataWatcherUnwatch = null;
  }

  if (boardDataWatcherUnwatch) {
    boardDataWatcherUnwatch();
    boardDataWatcherUnwatch = null;
  }

  if (tournamentReadyUnwatch) {
    tournamentReadyUnwatch();
    tournamentReadyUnwatch = null;
  }

  // An update still settling would otherwise run after the teardown and set its
  // effect over the idle one below — which is how the lights stayed on the
  // matchshot once Finish had left the match.
  settled.cancel();
  announcedWin = undefined;
  turnPlayer = "";
  turnEffect = undefined;
  playerUpHere = true;

  setEffectByTrigger("idle");
}

/**
 * What the turn up started with (see {@link turnEffect}): `bot_throw`, the
 * player's or their team's effect, `next_player` or `gameon`, as
 * turnStartEffect chooses. A trigger is settled on one of its effects here.
 * With Teams, a change of who throws is a change of `names`, and chooses again.
 */
function effectOfTheTurn(match: IMatch, names: readonly string[]): string | IWled {
  const turn = [ match.id, match.set, match.leg, match.round, match.player, match.turns[0]?.id, ...names ].join("\n");
  if (turnEffect?.turn !== turn) {
    const isBot = match.players?.[match.player]?.cpuPPR !== null;
    const effect = turnStartEffect(names, isBot, config.wledFx.effects, isTriggerPresent);
    turnEffect = { turn, effect: typeof effect === "string" ? pickEffect(effect) ?? effect : effect };
  }
  return turnEffect.effect;
}

/**
 * Process game data to trigger effects based on game events
 */
async function processGameData(
  gameData: IGameData,
  oldGameData: IGameData,
  fromWebSocket: boolean = false,
): Promise<void> {
  if (!gameData.match || !gameData.match.turns?.length) return;

  const names = turnNames(gameData.match);
  turnPlayer = names[0] ?? "";
  // Before anything below returns: the board events in between go by it.
  playerUpHere = await isPlayerUpHere(gameData.match);

  const editMode: boolean = gameData.match.activated !== undefined && gameData.match.activated >= 0;
  if (editMode) return;
  if (gameData.match.variant === "Bull-off" && isTriggerPresent("bulloff")) {
    setEffectByTrigger("bulloff");
    return;
  }

  // The same win reported again leaves the lights as they are — not even the
  // `gameon` fallback, which would take the matchshot off them.
  const win = winId(gameData.match);
  if (win) {
    if (win === announcedWin) return;
    announcedWin = win;
  }

  // gameon is the default effect to play when no other event happened
  let nextEffect: string | IWled = "gameon";

  // A visit that has just started: the player's own effect, or the one that
  // shows whoever is up. With Teams, `names` is the player's and then their
  // team's (utils/team-calls.ts). With *Keep the player's effect between
  // darts* it also stands in for gameon after a dart with no effect of its
  // own, as long as it is an effect: a bot's turn starts with `bot_throw`
  // whether or not an effect has that trigger.
  if (gameData.match.turns[0].throws.length === 0) {
    nextEffect = effectOfTheTurn(gameData.match, names);
  } else if (config.wledFx.keepTurnEffect) {
    const kept = effectOfTheTurn(gameData.match, names);
    if (typeof kept !== "string") nextEffect = kept;
  }

  const effect: string | null = await gameDataProcessor(gameData, oldGameData, fromWebSocket, isTriggerPresent, {
    leg: legWinNames(gameData.match),
    match: matchWinNames(gameData.match),
  });
  if (effect) {
    // found effect for match variant
    nextEffect = effect;
  }

  // Somebody elsewhere is up, an online opponent say: an effect on `other`
  // stands in for theirs. Without one, everybody's effects play.
  if (!playerUpHere && isTriggerPresent("other")) {
    nextEffect = "other";
  }

  if (typeof nextEffect === "string") setEffectByTrigger(nextEffect);
  else setEffect(nextEffect);
}

function isTriggerPresent(trigger: string): boolean {
  const present: boolean = config.wledFx.effects?.some(
    effect => effect.enabled && effect?.triggers.includes(trigger),
  );
  if (present) return present;

  // search for range trigger(range_[min]_[max])
  const points = Number(trigger);
  if (Number.isNaN(points)) return false;
  const range_triggers = config.wledFx.effects?.filter(
    effect =>
      effect.enabled && effect?.triggers.some(trigger => trigger.match(triggerPatterns.ranges)),
  );
  for (let i = 0; i < range_triggers.length; i++) {
    const element = range_triggers[i];
    for (let j = 0; j < element.triggers.length; j++) {
      const parts = element.triggers[j].match(triggerPatterns.ranges);
      if (!parts) continue;
      const min = Number(parts[1]);
      const max = Number(parts[2]);
      if (min <= points && points <= max) return true;
    }
  }

  return false;
}

/**
 * One of the switched-on effects on `trigger`, picked at random when there are
 * more; a number also finds the ranges that take it in.
 */
function pickEffect(trigger: string): IWled | undefined {
  // Find all effects that match the trigger
  const matchingEffects = config.wledFx.effects.filter(
    effect => effect.enabled && effect.triggers && effect.triggers.includes(trigger),
  );

  const points = Number(trigger);
  if (!matchingEffects.length && !Number.isNaN(points)) {
    const range_triggers = config.wledFx.effects.filter(
      effect =>
        effect.enabled && effect?.triggers.some(trigger => trigger.match(triggerPatterns.ranges)),
    );
    for (let i = 0; i < range_triggers.length; i++) {
      const element = range_triggers[i];
      for (let j = 0; j < element.triggers.length; j++) {
        const parts = element.triggers[j].match(triggerPatterns.ranges);
        if (!parts) continue;
        const min = Number(parts[1]);
        const max = Number(parts[2]);
        if (min <= points && points <= max) {
          matchingEffects.push(element);
          break;
        }
      }
    }
  }

  if (!matchingEffects.length) return undefined;

  // If multiple effects match the trigger, pick a random one
  return matchingEffects[Math.floor(Math.random() * matchingEffects.length)];
}

/**
 * Set an effect based on the trigger
 */
export async function setEffectByTrigger(trigger: string, wait: boolean = false): Promise<void> {
  if (!config) {
    config = await AutodartsToolsConfig.getValue();
    if (!config.wledFx.effects.length) {
      console.log("Autodarts Tools: WLED: No effects configured");
      return;
    }
  }

  // A trigger lights nothing while WLED is switched off. The lobby and match
  // scripts tear WLED down on every page they leave, whether it ever started or
  // not, and that teardown sends `idle`: it lit the lights with WLED off. The
  // settings' send and Test buttons go to tryEffect, so they still work.
  if (!config.wledFx?.enabled) return;

  const nextEffect = pickEffect(trigger);
  if (!nextEffect) {
    console.log(`Autodarts Tools: WLED: No effect found for trigger "${trigger}"`);
    return;
  }

  console.log(`Autodarts Tools: WLED: Found matching effect ${nextEffect.name}`);
  await setEffect(nextEffect, wait);
}

export async function setEffect(effect: IWled, wait: boolean = false) {
  if (!config)
    config = await AutodartsToolsConfig.getValue();

  if (!effect.url) {
    console.info("Autodarts Tools: WLED: effect", effect.name, "doesn't have an url");
    return;
  }
  const request = wledRequest(effect, turnPlayer);
  if (config.wledFx.onlyOnce && request.key === lastRequest) {
    console.info("Autodarts Tools: WLED: didn't fetch", request.url, "because the effect is already active");
    return;
  }
  lastRequest = request.key;
  await send(request, wait);
}

/**
 * An effect tried in the settings, with its play button or Test. There is no
 * turn there, so `player` stands in for the placeholders, and it is sent on
 * every press: *Don't restart a running effect* is about the effects a game
 * sets off.
 */
export async function tryEffect(effect: IWled, player: string): Promise<void> {
  if (!effect.url) return;
  await send(wledRequest(effect, player));
}

async function send(request: WledRequest, wait: boolean = false): Promise<void> {
  console.info("Autodarts Tools: WLED: fetching", request.url);

  const controller = new AbortController();
  const init: RequestInit = { ...request.init, signal: controller.signal };
  if (wait) {
    try {
      // Use setTimeout to ensure the fetch doesn't block or interfere with page state
      // This makes it truly fire-and-forget
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      await fetch(request.url, init);
      clearTimeout(timeoutId);
    } catch (e) {
      const error = e as Error;
      if (error.name !== "AbortError") {
        console.log("Autodarts Tools: WLED: Request failed (non-critical)", error);
      }
    }
  } else {
    setTimeout(() => {
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      fetch(request.url, init)
        .then(() => {
          clearTimeout(timeoutId);
          // Success - no need to do anything with no-cors response
        })
        .catch((e) => {
          const error = e as Error;
          clearTimeout(timeoutId);
          // Silently ignore errors to prevent interfering with game state
          if (error.name !== "AbortError") {
            console.log("Autodarts Tools: WLED: Request failed (non-critical)", error);
          }
        });
    }, 0);
  }
}
