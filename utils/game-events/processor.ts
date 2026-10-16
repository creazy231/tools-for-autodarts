import { boardTrigger, isOnALobbyPage, lobbyTrigger } from "./board";
import { contextTokens, deriveTriggers } from "./derive";
import { weightsFor } from "./priorities";

import type { IBoard } from "@/utils/board-data-storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { GameModeSettings } from "@/utils/game-modes";
import type { Here } from "@/utils/own-board";
import type { IMatch } from "@/utils/websocket-helpers";
import type { PriorityFeature } from "./priorities";
import type { FallbackKind, IGameEvent, IGameTrigger, IRankedTrigger, TriggerCategory, TriggerSource } from "./types";

import { AutodartsToolsBoardData } from "@/utils/board-data-storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { pageVariant, playsIn } from "@/utils/game-modes";
import { getUserIdFromToken } from "@/utils/helpers";
import { selectedBoard } from "@/utils/lobby-guests";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { settleGameData } from "@/utils/settle-game-data";
import { loadTeamCalls, matchWinNames, turnNames } from "@/utils/team-calls";

/**
 * The one place game data turns into triggers, for the Caller, Sound FX, WLED
 * and Animations.
 *
 * Each of them used to watch the stored game data, diff every update against
 * the one before and work out on its own what had happened — the same win
 * guard four times, the same board table three times, the single bull six
 * times over — and they had drifted apart. Now a feature registers here, says
 * which kinds of trigger it takes, and is handed the update's triggers ranked
 * by its own priority order (utils/game-events/priorities.ts); what it plays
 * for them is its own business (utils/game-events/match.ts).
 *
 * Updates come two ways. A state frame that brought game events with it (see
 * `IGameData.batch`) is acted on straight away: the events say it is new. One
 * without — a page load, a correction, an event lost on the way — goes through
 * the settler as before (utils/settle-game-data.ts), and the two share its
 * note of what was acted on last, so nothing is called twice.
 *
 * Every content script bundle has its own copy of this module, and the stored
 * game data is shared by every tab, so it only acts on the match of its own page.
 */

/** A feature's config, as far as this reads it. */
export interface TriggerSettings extends GameModeSettings {
  priorityOrder?: readonly unknown[];
}

export interface TriggerUpdate {
  /**
   * Most important first, which is also the order the sound features play in.
   * Those of kinds the feature does not take are `partOnly`: the matcher
   * (utils/game-events/match.ts) only uses them inside a `+` item.
   */
  triggers: IRankedTrigger[];
  /** Whoever is up and the game, which `+` items may name besides the triggers: pass it to the matcher. */
  context: string[];
  match: IMatch;
  source: TriggerSource;
}

export interface TriggerRegistration {
  feature: PriorityFeature;
  /** The feature's config, read at every update so a change applies straight away. */
  settings: () => TriggerSettings | undefined;
  /** The kinds of trigger it takes, read at every update. */
  categories: () => readonly TriggerCategory[];
  /** The stand-ins it takes for a dart it has nothing for. */
  fallbacks?: readonly FallbackKind[];
  /** Anything else it leaves out. */
  filter?: (trigger: IGameTrigger, match: IMatch) => boolean;
  /** Every update of its match, even one with nothing in it for the feature. */
  onTriggers: (update: TriggerUpdate) => void;
  /** A board event, for a feature that plays in the page's game. */
  onBoard?: (trigger: string) => void;
  /** Somebody joining or leaving the lobby on screen, while the feature is on. */
  onLobby?: (trigger: string) => void;
  /** A dart being corrected: whatever is playing is out of date. */
  onEdit?: () => void;
}

const registrations = new Set<TriggerRegistration>();

let started: Promise<void> | undefined;
let generation = 0;
let unwatchers: (() => void)[] = [];

/** The state acted on last, which the next is compared with. */
let lastActed: IMatch | undefined;
let lastBatchId: string | undefined;
/** Cricket: the current player's score when the visit began. */
let turnStartScore: number | undefined;
let localUserId: string | null = null;

/**
 * What each feature has had once already in this match: a leg's gameon, the
 * bull-off, a win. Kept when the features are torn down and started again,
 * as they are on the hand-over from the bull-off, and cleared by a new match.
 */
const announced = new Map<PriorityFeature, Set<string>>();
let announcedMatch: string | undefined;

const settler = settleGameData(gameData => gameData.match && act(gameData.match, [], "state"));

/** Starts the feature on the triggers, and returns what stops it. */
export function registerTriggers(registration: TriggerRegistration): () => void {
  registrations.add(registration);
  start()
    .then(() => initFor(registration))
    .catch(error => console.error("Autodarts Tools: game events", error));

  return () => {
    registrations.delete(registration);
    if (!registrations.size) stop();
  };
}

function start(): Promise<void> {
  started ??= (async () => {
    const run = ++generation;
    await loadTeamCalls();
    localUserId = await getUserIdFromToken();
    const gameData = await AutodartsToolsGameData.getValue();
    const stored = gameData?.match;
    if (run !== generation) return;

    // The events stored now were for an update before this page started.
    lastBatchId = gameData?.batch?.id;
    if (stored && onThisPage(stored)) {
      forgetIfNew(stored);
      lastActed = stored;
    }

    unwatchers = [
      AutodartsToolsGameData.watch(onGameData),
      AutodartsToolsBoardData.watch((board) => {
        onBoardData(board).catch(error => console.error("Autodarts Tools: game events", error));
      }),
      AutodartsToolsLobbyData.watch(onLobbyData),
    ];
  })();
  return started;
}

function stop(): void {
  generation++;
  started = undefined;
  unwatchers.forEach(unwatch => unwatch());
  unwatchers = [];
  // Whatever is still settling is for features that are gone.
  settler.cancel();
}

/** A feature starting on the stored state calls a game that is about to begin, and nothing it has missed. */
async function initFor(registration: TriggerRegistration): Promise<void> {
  if (!registrations.has(registration)) return;
  const match = (await AutodartsToolsGameData.getValue())?.match;
  if (!match?.turns?.length || !onThisPage(match) || isEditing(match)) return;

  forgetIfNew(match);
  const names = namesOf(match);
  const triggers = deriveTriggers({ events: [], state: match, source: "init", names, localUserId, here: here() });
  deliver(registration, triggers, contextTokens(match, names.turn), match, "init");
}

function onGameData(gameData: IGameData | undefined, oldGameData: IGameData | undefined): void {
  const match = gameData?.match;
  if (!gameData || !match?.turns?.length || !onThisPage(match)) return;
  forgetIfNew(match);

  if (isEditing(match)) {
    settler.cancel();
    for (const registration of registrations) {
      if (playsIn(registration.settings(), match.variant)) registration.onEdit?.();
    }
    return;
  }

  const batch = gameData.batch;
  if (batch && batch.id !== lastBatchId) {
    lastBatchId = batch.id;
    if (batch.events.length) {
      settler.flushBefore(gameData);
      act(match, batch.events, "events");
      settler.markActed(gameData);
      return;
    }
  }

  settler.push(gameData, oldGameData ?? gameData);
}

function act(match: IMatch, events: readonly IGameEvent[], source: TriggerSource): void {
  const prev = lastActed?.id === match.id ? lastActed : undefined;
  const names = namesOf(match);
  // The access token can land after the match does: ask again for the next update.
  if (!localUserId) getUserIdFromToken().then(id => (localUserId = id)).catch(() => undefined);
  const triggers = deriveTriggers({ events, state: match, prev, source, names, localUserId, here: here(), turnStartScore });
  const context = contextTokens(match, names.turn);
  lastActed = match;
  if (!match.turns?.[0]?.throws?.length) turnStartScore = match.gameScores?.[match.player];

  console.log(`Autodarts Tools: game events (${source})`, events.map(event => event.event), triggers/* .map(trigger => trigger.trigger) */);
  for (const registration of registrations) deliver(registration, triggers, context, match, source);
}

/** Hands a feature the triggers it takes, once-only ones it has not had yet, and the rest as parts only, ranked by its order. */
function deliver(registration: TriggerRegistration, triggers: readonly IGameTrigger[], context: string[], match: IMatch, source: TriggerSource): void {
  const settings = registration.settings();
  if (!playsIn(settings, match.variant)) return;

  const categories = registration.categories();
  const usable = triggers.filter(trigger =>
    (!trigger.fallback || !!registration.fallbacks?.includes(trigger.fallback))
    && (registration.filter?.(trigger, match) ?? true));
  let taken = usable.filter(trigger => categories.includes(trigger.category));
  // What the feature does not take may still be a part of a `+` item beside
  // what it does: a Caller that does not call every dart still calls
  // `gameshot+d20`. Once-only ones stay out, as nothing marks them had here.
  const parts = usable.filter(trigger => !categories.includes(trigger.category) && !trigger.onceKey);

  const done = announcedFor(registration.feature);
  if (taken.some(trigger => trigger.exclusive && trigger.onceKey && done.has(trigger.onceKey))) return;
  taken = taken.filter(trigger => !trigger.onceKey || !done.has(trigger.onceKey));
  for (const trigger of taken) {
    if (trigger.onceKey) done.add(trigger.onceKey);
  }

  const weights = weightsFor(registration.feature, settings?.priorityOrder);
  const ranked: IRankedTrigger[] = [
    ...taken.map(trigger => ({ ...trigger, priority: weights[trigger.level] + trigger.bonus })),
    ...parts.map(trigger => ({ ...trigger, priority: weights[trigger.level] + trigger.bonus, partOnly: true })),
  ].sort((a, b) => b.priority - a.priority);

  try {
    registration.onTriggers({ triggers: ranked, context, match, source });
  } catch (error) {
    console.error(`Autodarts Tools: ${registration.feature} failed on its triggers`, error);
  }
}

async function onBoardData(board: IBoard | undefined): Promise<void> {
  const trigger = board && boardTrigger(board);
  if (!trigger) return;

  // A board event follows the game of this page's own match: in a lobby the
  // stored match is the last one played, and its game says nothing here.
  const stored = await AutodartsToolsGameData.getValue();
  const variant = pageVariant(stored?.match, window.location.href);
  for (const registration of registrations) {
    if (registration.onBoard && playsIn(registration.settings(), variant)) registration.onBoard(trigger);
  }
}

function onLobbyData(lobby: Parameters<typeof lobbyTrigger>[0], old: Parameters<typeof lobbyTrigger>[1]): void {
  if (!isOnALobbyPage(window.location.href)) return;
  const trigger = lobbyTrigger(lobby, old);
  if (!trigger) return;
  // Lobby events play in any game: a lobby has none yet.
  for (const registration of registrations) {
    if (registration.onLobby && registration.settings()?.enabled) registration.onLobby(trigger);
  }
}

/** A dart being corrected: `activated` is the dart's index until the correction is done. */
function isEditing(match: IMatch): boolean {
  return match.activated !== undefined && match.activated >= 0;
}

/**
 * Whether a match is the one this page shows: the one in a `/matches/<id>`
 * address, or the one a `/boards/<id>` page's board plays in.
 */
function onThisPage(match: IMatch): boolean {
  const href = window.location.href;
  const matchId = href.match(/\/matches\/([0-9a-f-]+)/i)?.[1];
  if (matchId) return matchId === match.id;
  const boardId = href.match(/\/boards\/([0-9a-f-]+)/i)?.[1];
  return !!boardId && (match.players ?? []).some(player => player.boardId === boardId);
}

function forgetIfNew(match: IMatch): void {
  if (match.id === announcedMatch) return;
  announcedMatch = match.id;
  announced.clear();
  if (lastActed?.id !== match.id) lastActed = undefined;
  turnStartScore = undefined;
}

function announcedFor(feature: PriorityFeature): Set<string> {
  let done = announced.get(feature);
  if (!done) announced.set(feature, done = new Set());
  return done;
}

/** Where this browser is: its page, and the board the site autoscores with here (utils/own-board.ts). */
function here(): Here {
  return { url: window.location.href, selected: selectedBoard() };
}

function namesOf(match: IMatch): { turn: string[]; matchWin: string[] } {
  return { turn: turnNames(match), matchWin: matchWinNames(match) };
}
