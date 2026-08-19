import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IMatch } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { getUserIdFromToken } from "@/utils/helpers";

/**
 * Quiet Own Darts — autodarts' dart-landed sound, for the darts you cannot
 * already hear.
 *
 * A board makes its own noise. When the darts going into it are the ones in
 * front of you, the site's thud lands a moment after the real one and says
 * nothing you did not just hear; when they belong to someone at the other end
 * of the country it is the only sign a dart was thrown at all. So the sound
 * stays for everybody else and goes for you.
 *
 * Two halves. This one has the match data, works out whether the player at the
 * oche is throwing within earshot, and pushes that one boolean over to
 * entrypoints/quiet-own-darts.ts, which sits in the page's world with howler
 * and drops the sound when it is true.
 *
 * The switch that turns it on is somewhere else again — see
 * utils/quiet-own-darts-switch.ts, which draws it into autodarts' own sound
 * settings, both the in-match dialog and the settings page.
 */

/** Event the page-world half listens on. See entrypoints/quiet-own-darts.ts. */
const FLAG_EVENT = "adt-quiet-own-darts";

let gameDataWatcherUnwatch: (() => void) | undefined;
let configWatcherUnwatch: (() => void) | undefined;
let injected = false;
let localUserId: string | null = null;
let enabled = false;
let quiet = false;

export async function quietOwnDarts(): Promise<void> {
  console.log("Autodarts Tools: Quiet Own Darts");

  if (!injected) {
    await injectScript("/quiet-own-darts.js", { keepInDom: true });
    injected = true;
  }

  const config: IConfig = await AutodartsToolsConfig.getValue();
  enabled = config.quietOwnDarts?.enabled ?? false;

  await apply(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(apply);

  // The switch is drawn by another script entirely, so the config is how its
  // position gets here — including from the settings page, in a different tab,
  // with this match still open in this one.
  configWatcherUnwatch?.();
  configWatcherUnwatch = AutodartsToolsConfig.watch((next: IConfig) => {
    const value = next.quietOwnDarts?.enabled ?? false;
    if (value === enabled) return;
    enabled = value;
    void apply(undefined);
  });
}

export function quietOwnDartsOnRemove(): void {
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  configWatcherUnwatch?.();
  configWatcherUnwatch = undefined;
  // The page-world patch outlives this teardown, so leaving the flag set would
  // go on swallowing the sound with nothing left to switch it back.
  send(false);
}

/**
 * Work out whether the sound should be dropped right now, and say so if that
 * has changed. Called for every match message, so it settles for two field
 * reads when the player at the oche is the same one as last time.
 */
async function apply(gameData?: IGameData): Promise<void> {
  const match = (gameData ?? await AutodartsToolsGameData.getValue())?.match;
  // Asked for again every time until it answers. The id comes out of the access
  // token, which is captured from the page's own traffic and can easily land
  // after the match screen does; reading it once at startup left it null for
  // the rest of the match, and a null id means nobody is ever you.
  if (!localUserId) localUserId = await getUserIdFromToken();
  send(enabled && !!match && isWithinEarshot(match));
}

function send(next: boolean): void {
  if (next === quiet) return;
  quiet = next;
  window.dispatchEvent(new CustomEvent(FLAG_EVENT, { detail: { quiet } }));
}

/**
 * Whether the player at the oche is throwing at a board you can hear.
 *
 * Your own throws are the obvious case, but not the only one: a friend sitting
 * next to you with an account of their own, or a guest typed into the lobby,
 * throws at the same board and is every bit as audible. Both of those share
 * your board, so the board is what this goes by, with your own account as the
 * one case that needs no board at all — matches played without one still know
 * who you are.
 *
 * A bot has neither, which is right: nothing lands in the room when it throws.
 */
function isWithinEarshot(match: IMatch): boolean {
  const current = match.players?.[match.player];
  if (!current) return false;
  if (localUserId && current.userId === localUserId) return true;

  const board = ownBoardId(match);
  return !!board && current.boardId === board;
}

/** The board whose darts this browser is sitting in front of. */
function ownBoardId(match: IMatch): string | undefined {
  // Watching a board directly names it in the URL, and that is the board being
  // watched whoever happens to be signed in.
  const watched = window.location.href.match(/\/boards\/([0-9a-f-]+)/)?.[1];
  if (watched) return watched;

  const mine = localUserId
    ? match.players?.find(player => player.userId === localUserId)?.boardId
    : undefined;
  if (mine) return mine;

  // Nobody in the match is you — someone else is playing on your board while
  // you watch. `selectedBoard` is the site's own note of which board this
  // browser is pointed at.
  return localStorage.getItem("selectedBoard") ?? undefined;
}
