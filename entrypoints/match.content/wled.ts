import type { TriggerUpdate } from "@/utils/game-events/processor";
import type { MatchOptions } from "@/utils/game-events/match";
import type { IRankedTrigger } from "@/utils/game-events/types";
import type { IMatch } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { GameMode, pageVariant } from "@/utils/game-modes";
import { getUserIdFromToken } from "@/utils/helpers";
import { selectedBoard } from "@/utils/lobby-guests";
import { isPlayerUpInTheRoom } from "@/utils/own-board";
import { AutodartsToolsConfig, type IConfig, type IWled } from "@/utils/storage";
import { isOnALobbyPage } from "@/utils/game-events/board";
import { spellings } from "@/utils/game-events/derive";
import { itemsOn, oneOn, pickBest } from "@/utils/game-events/match";
import { registerTriggers } from "@/utils/game-events/processor";
import { TriggerCategory } from "@/utils/game-events/types";
import { turnNames } from "@/utils/team-calls";
import { isTournamentPage, watchTournamentReady } from "@/utils/tournament-ready";
import { type WledRequest, wledRequest } from "@/utils/wled-request";

let unregisterTriggers: (() => void) | null = null;
let tournamentReadyUnwatch: (() => void) | null = null;
let config: IConfig;

/**
 * Whether the player up throws in this room (utils/own-board.ts): you, a guest
 * or a bot you added, anyone at your board. While somebody elsewhere is up, an
 * online opponent say, an effect on `other` stands in for every effect, board
 * events included.
 *
 * Settled by every game update, and from the stored match as the page opens,
 * since board events can come first. True until a match says otherwise.
 */
let playerUpHere = true;

/** Your account, which tells your guests and bots: asked for until the access token has landed. */
let localUserId: string | null = null;

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
 * once a turn, as the player comes up, and settled on one effect, so a player
 * with more than one, or more than one `next_player` effect, keeps the one
 * their turn started with for all its darts. A player alone keeps it for the
 * leg. Forgotten whenever WLED starts on a page, as the effects may have changed.
 */
let turnEffect: { turn: string; effect: string | IWled } | undefined;

/** What WLED lights for a game's triggers (utils/game-events/derive.ts); a practice game's target is its own. */
const CATEGORIES: readonly TriggerCategory[] = [
  TriggerCategory.OUTCOME,
  TriggerCategory.PLAYER,
  TriggerCategory.START,
  TriggerCategory.THROW,
  TriggerCategory.TOTAL,
  TriggerCategory.COMBO,
  TriggerCategory.VARIANT,
  TriggerCategory.TARGET,
];

/** A bot coming up has always lit `bot_throw`, the effect for its darts. */
const MATCH_OPTIONS: MatchOptions = {
  forms: trigger => (trigger === "bot" ? [ "bot_throw" ] : [ trigger ]),
};

/**
 * Whether the player up in `match` throws in this room. One who can't be told
 * yet, a guest with no board before the access token has landed, counts as
 * here: `other` is for somebody known to be elsewhere.
 */
function isPlayerUpHere(match: IMatch | undefined): boolean {
  if (!localUserId) getUserIdFromToken().then(id => (localUserId = id)).catch(() => undefined);
  return isPlayerUpInTheRoom(match, localUserId, { url: window.location.href, selected: selectedBoard() }) !== false;
}

/**
 * A board event's effect. Board frames don't say which board sent them, so an
 * event belongs to whoever is up: while that is somebody elsewhere, `other` is
 * showing, and their takeout leaves it there. A lobby or a tournament page has
 * nobody up, whatever the last match left behind, so its events are yours.
 */
function boardEffect(trigger: string): void {
  if (!itemsOn(config.wledFx.effects, trigger).length) return;
  if (!playerUpHere && itemsOn(config.wledFx.effects, "other").length && !isOnALobbyPage(window.location.href) && !isTournamentPage()) return;
  setEffectByTrigger(trigger);
}

export async function wledFx() {
  console.log("Autodarts Tools: WLED: WLED FX");

  try {
    config = await AutodartsToolsConfig.getValue();
    lastRequest = undefined;
    turnEffect = undefined;
    localUserId = await getUserIdFromToken();
    const gameData = await AutodartsToolsGameData.getValue();
    console.log(`Autodarts Tools: WLED: Config loaded, ${config.wledFx?.effects?.length || 0} effects available`);

    // Board events can arrive before the first game update, so who is up is
    // settled up front: from the stored match on its own page, and nobody
    // elsewhere anywhere else. A lobby's stored match is the last one played.
    playerUpHere = pageVariant(gameData.match, window.location.href) === undefined
      || isPlayerUpHere(gameData.match);

    unregisterTriggers ??= registerTriggers({
      feature: "wledFx",
      settings: () => config?.wledFx,
      categories: () => CATEGORIES,
      fallbacks: [ "outside", "missWildcard" ],
      // Cricket counts points only on numbers already closed, so nearly every
      // visit totals 0 however many marks it took, and an effect on `0` lit up
      // after almost all of them. Like Sound FX, leave Cricket's visit totals out.
      filter: trigger => trigger.tag !== "cricketScore",
      onTriggers: showEffect,
      onBoard: boardEffect,
      onLobby: trigger => setEffectByTrigger(trigger),
    });

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

  // Stopped before the idle effect below, so no update still settling sets its
  // effect over it — which is how the lights stayed on the matchshot once
  // Finish had left the match.
  unregisterTriggers?.();
  unregisterTriggers = null;

  if (tournamentReadyUnwatch) {
    tournamentReadyUnwatch();
    tournamentReadyUnwatch = null;
  }

  turnPlayer = "";
  turnEffect = undefined;
  playerUpHere = true;

  setEffectByTrigger("idle");
}

/**
 * What the turn up started with (see {@link turnEffect}): `bot_throw` for a
 * bot; else the effect on the first of `names` that has one (the player's,
 * then their team's, each as typed and with underscores for its spaces, and in
 * a `+` item with the context, `alice+x01`); then `next_player`, which can
 * show whoever is up; and `gameon` when there is none of those. A trigger is
 * settled on one of its effects here. With Teams, a change of who throws is a
 * change of `names`, and chooses again.
 */
function effectOfTheTurn(match: IMatch, names: readonly string[], context: string[]): string | IWled {
  // Alone it is the same player's turn the whole leg, so their effect is kept for the leg.
  const solo = (match.players?.length ?? 0) === 1;
  const visit = solo ? [] : [ match.round, match.player, match.turns?.[0]?.id ];
  const turn = [ match.id, match.set, match.leg, ...visit, ...names ].join("\n");
  if (turnEffect?.turn === turn) return turnEffect.effect;

  let effect: string | IWled;
  if (match.players?.[match.player]?.cpuPPR) {
    effect = "bot_throw";
  } else {
    const nameTriggers: IRankedTrigger[] = names.flatMap((name, index) => spellings(name).map(spelling => ({
      trigger: spelling,
      category: TriggerCategory.PLAYER,
      level: "PLAYER_NAME" as const,
      bonus: -0.1 * index,
      priority: 10 - 0.1 * index,
    })));
    effect = pickBest(config.wledFx.effects, nameTriggers, { context })?.items[0]
      ?? (itemsOn(config.wledFx.effects, "next_player").length ? "next_player" : "gameon");
  }
  turnEffect = { turn, effect: typeof effect === "string" ? pickEffect(effect) ?? effect : effect };
  return turnEffect.effect;
}

/**
 * The effect for an update: the one on its highest trigger in WLED's order
 * (utils/game-events/priorities.ts). Without one, a visit that has just
 * started shows its turn's effect, the player's say, and so does a dart with
 * *Keep the player's effect between darts*; else `gameon`. A win reported
 * again never gets here, so the lights stay on it.
 */
function showEffect({ triggers, context, match }: TriggerUpdate): void {
  const names = turnNames(match);
  turnPlayer = names[0] ?? "";
  playerUpHere = isPlayerUpHere(match);

  // Somebody elsewhere is up, an online opponent say: an effect on `other`
  // stands in for theirs. Without one, everybody's effects play.
  if (!playerUpHere && itemsOn(config.wledFx.effects, "other").length) {
    setEffectByTrigger("other");
    return;
  }

  const found = pickBest(config.wledFx.effects, triggers, { ...MATCH_OPTIONS, context });
  // Whoever comes up gets the effect their turn settles on, not one picked
  // afresh, so their darts with no effect of their own bring the same one back.
  if (found?.category === TriggerCategory.PLAYER) {
    const kept = effectOfTheTurn(match, names, context);
    const effect = typeof kept === "string" ? found.items[0] : kept;
    console.log(`Autodarts Tools: WLED: "${found.matched}" lights ${effect.name}`);
    setEffect(effect);
    return;
  }
  if (found) {
    console.log(`Autodarts Tools: WLED: "${found.matched}" lights ${found.items[0].name}`);
    setEffect(found.items[0]);
    return;
  }

  // The bull-off is announced once, but stays lit while it lasts.
  if (match.variant === GameMode.BULL_OFF && itemsOn(config.wledFx.effects, "bulloff").length) {
    setEffectByTrigger("bulloff");
    return;
  }

  // A visit that has just started: the player's own effect, or the one that
  // shows whoever is up. With *Keep the player's effect between darts* it also
  // stands in for gameon after a dart with no effect of its own, as long as it
  // is an effect: a bot's turn starts with `bot_throw` whether or not an
  // effect has that trigger.
  const visitStarted = !match.turns?.[0]?.throws?.length;
  if (match.variant !== GameMode.BULL_OFF && (visitStarted || config.wledFx.keepTurnEffect)) {
    const kept = effectOfTheTurn(match, names, context);
    if (typeof kept !== "string") {
      setEffect(kept);
      return;
    }
    if (visitStarted) {
      setEffectByTrigger(kept);
      return;
    }
  }

  // gameon is the default effect to play when no other event happened
  setEffectByTrigger("gameon");
}

/** One of the switched-on effects on `trigger`, picked at random when there are more; a number also finds the ranges that take it in. */
function pickEffect(trigger: string): IWled | undefined {
  return oneOn(config.wledFx.effects, trigger);
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
