import type { ILobbies } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData, type IGameData } from "@/utils/game-data-storage";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { AutodartsToolsBoardData, type IBoard } from "@/utils/board-data-storage";
import { AutodartsToolsTournamentData, type ITournament } from "@/utils/tournament-data-storage";
import { AutodartsToolsConfig, type IConfig, type IWled } from "@/utils/storage";
import { triggerPatterns } from "@/utils/helpers";
import { gameDataProcessor } from "@/utils/wled";
import { WledType } from "#imports";

let gameDataWatcherUnwatch: any;
let lobbyDataWatcherUnwatch: any;
let boardDataWatcherUnwatch: any;
let tournamentDataWatcherUnwatch: any;
let config: IConfig;
let currentBoardId: string;

let debounceTimer: number | null = null;
const DEBOUNCE_DELAY = 200;

function eventTrigger(trigger: string) {
  if (isTriggerPresent(trigger) &&
    (
      config!.wledFx.boardIds.length === 0 ||
      (
        config!.wledFx.boardIds.length > 0 &&
        config!.wledFx.boardIds.includes(currentBoardId)
      )
    )
  )
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
    const gameData = await AutodartsToolsGameData.getValue();
    console.log(`Autodarts Tools: WLED: Config loaded, ${config.wledFx?.effects?.length || 0} effects available`);

    if (!gameDataWatcherUnwatch) {
      gameDataWatcherUnwatch = AutodartsToolsGameData.watch(
        (gameData: IGameData, oldGameData: IGameData) => {
          if (!config.wledFx?.enabled) return;

          // Debounce the processGameData call
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }

          debounceTimer = window.setTimeout(() => {
            processGameData(gameData, oldGameData, true);
            debounceTimer = null;
          }, DEBOUNCE_DELAY);
        },
      );

      const url = window.location.href;
      const matchId = url.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
      )?.[0];

      if (gameData.match?.id === matchId) {
        processGameData(gameData, gameData);
      }
    }

    if (!lobbyDataWatcherUnwatch) {
      lobbyDataWatcherUnwatch = AutodartsToolsLobbyData.watch(
        async (_lobbyData: ILobbies | undefined, _oldLobbyData: ILobbies | undefined) => {
          if (!_lobbyData || !_oldLobbyData || !config.wledFx?.enabled) return;
          const currentURL = window.location.href;
          if (!currentURL.includes("lobbies")) return;

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
      boardDataWatcherUnwatch = AutodartsToolsBoardData.watch((boardData: IBoard) => {
        checkStatus(boardData).catch(console.error);
      });
    }

    if (!tournamentDataWatcherUnwatch) {
      tournamentDataWatcherUnwatch = AutodartsToolsTournamentData.watch(
        async (tournamentData: ITournament | undefined, oldTournamentData: ITournament | undefined) => {
          if (!tournamentData || !config.wledFx?.enabled) return;

          // Check if tournament event is "start" and trigger the tournament_ready effect
          if (tournamentData.event === "start") {
            console.log("Autodarts Tools: WLED: Tournament start event detected, triggering tournament_ready effect");
            setEffectByTrigger("tournament_ready");
          }
        },
      );
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

  if (tournamentDataWatcherUnwatch) {
    tournamentDataWatcherUnwatch();
    tournamentDataWatcherUnwatch = null;
  }

  setEffectByTrigger("idle");
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

  const editMode: boolean = gameData.match.activated !== undefined && gameData.match.activated >= 0;
  if (editMode) return;
  if (gameData.match.variant === "Bull-off" && isTriggerPresent("bulloff")) {
    setEffectByTrigger("bulloff");
    return;
  }

  // gameon is the default effect to play when no other event happened
  let nextEffect: string | IWled = "gameon";

  // Play player effect when it's the next players turn
  if (gameData.match.turns[0].throws.length === 0) {
    const currentPlayer = gameData.match.players?.[gameData.match.player];
    const isBot = currentPlayer?.cpuPPR !== null;
    const playerName = currentPlayer?.name;

    if (isBot) {
      console.log("Autodarts Tools: WLED: Bot player detected");
      nextEffect = "bot_throw";
    } else if (playerName) {
      // Try to find player effect (both regular and underscore version)
      const playerNameLower = playerName.toLowerCase();
      const playerNameWithUnderscores = playerNameLower.replace(/\s+/g, "_");
      const playerNameEffects = config.wledFx.effects?.filter(
        effect =>
          effect.enabled
          && effect.triggers
          && (effect.triggers.includes(playerNameLower)
            || effect.triggers.includes(playerNameWithUnderscores)),
      );

      if (playerNameEffects.length > 0) {
        console.log(
          `Autodarts Tools: WLED: Found player name effect for ${playerNameWithUnderscores}`,
        );

        const randomIndex = Math.floor(Math.random() * playerNameEffects.length);
        nextEffect = playerNameEffects[randomIndex];
      }
    }
  }

  const effect: string | null = await gameDataProcessor(gameData, oldGameData, fromWebSocket, isTriggerPresent);
  if (effect) {
    // found effect for match variant
    nextEffect = effect;
  }

  currentBoardId = gameData.match.players?.[gameData.match.player].boardId;

  if (
    config.wledFx.boardIds.length > 0
    && isTriggerPresent("other")
    && !config.wledFx.boardIds.includes(currentBoardId)
  ) {
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

  if (!matchingEffects.length) {
    console.log(`Autodarts Tools: WLED: No effect found for trigger "${trigger}"`);
    return;
  }

  // If multiple effects match the trigger, pick a random one
  const randomIndex = Math.floor(Math.random() * matchingEffects.length);
  const nextEffect = matchingEffects[randomIndex];

  console.log(`Autodarts Tools: WLED: Found matching effect ${nextEffect.name}`);
  await setEffect(nextEffect, wait);
}

let currentEffect: IWled;
export async function setEffect(effect: IWled, wait: boolean = false) {
  if (!config)
    config = await AutodartsToolsConfig.getValue();

  if (config.wledFx.onlyOnce && effect === currentEffect) {
    console.info("Autodarts Tools: WLED: didn't fetch", effect.url, "because the effect is already active");
    return;
  }
  if (!effect.url) {
    console.info("Autodarts Tools: WLED: effect", effect.name, "doesn't have an url");
    return;
  }
  currentEffect = effect;
  console.info("Autodarts Tools: WLED: fetching", effect.url);

  const controller = new AbortController();
  const data = {
    mode: "no-cors",
    method: effect.type === WledType.URL ? "GET" : "POST",
    signal: controller.signal,
    cache: "no-cache",
    credentials: "omit",
    ...(effect.type === WledType.API && {
      headers: { 'Content-Type': 'application/json' },
      body: effect.json_api
    }),
  };
  let url = effect.url;
  if (effect.type === WledType.PRESET) {
    url = (effect.url.startsWith('http') ? '' : 'http://')
      + effect.url
      + (effect.url.endsWith('/') ? '' : '/')
      + 'win/PL=' + effect.preset;
  }
  if (wait) {
    try {
      // Use setTimeout to ensure the fetch doesn't block or interfere with page state
      // This makes it truly fire-and-forget
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      await fetch(url, data);
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
      fetch(url, data)
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
