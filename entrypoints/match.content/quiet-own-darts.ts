import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IMatch, IPlayer } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { getUserIdFromToken } from "@/utils/helpers";
import { selectedBoard } from "@/utils/lobby-guests";
import { isPlayerUpInTheRoom } from "@/utils/own-board";

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
 * oche is throwing within earshot, and raises one attribute on `<html>` while
 * they are; entrypoints/quiet-own-darts.ts sits in the page's world with howler
 * and drops the sound for as long as the attribute is there.
 *
 * The site plays the thud off its `game-events` frame for the throw, which
 * arrives a beat *before* the state frame that carries the same dart, so the
 * flag for a dart is always whatever the previous state left it at. That is
 * fine — whose turn it is was settled a second or more earlier, by the state
 * that started the turn — as long as nothing else moves the flag in between.
 *
 * The switch that turns it on is somewhere else again — see
 * utils/quiet-own-darts-switch.ts, which draws it into autodarts' own sound
 * settings, both the in-match dialog and the settings page.
 */

/**
 * Raised on <html> while the sound is to be dropped. See entrypoints/quiet-own-darts.ts.
 *
 * Not `data-adt-quiet-own-darts`: that name marks the switch's own row in the
 * sound settings, and utils/quiet-own-darts-switch.ts removes whatever carries
 * it whenever those settings are off screen — which, with the flag under the
 * same name, was the whole document.
 */
const FLAG_ATTR = "data-adt-quiet-dart-landed";

let gameDataWatcherUnwatch: (() => void) | undefined;
let configWatcherUnwatch: (() => void) | undefined;
let injected = false;
let localUserId: string | null = null;
let enabled = false;

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
  // The page-world patch outlives this teardown, so leaving the flag up would
  // go on swallowing the sound with nothing left to take it down.
  send(false);
}

/**
 * Work out whether the sound should be dropped right now, and say so. Called
 * for every match message, so it settles for two field reads when the player
 * at the oche is the same one as last time.
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

/**
 * Show the page-world half the decision.
 *
 * An attribute on the document rather than an event: it is the one thing a
 * content script can write that every browser lets the page read back. Firefox
 * keeps the page away from a content script's objects — a CustomEvent's
 * `detail` included, which is what this used to send — and so on Firefox the
 * flag never arrived and the sound was never dropped. Setting it is idempotent,
 * so there is nothing to compare against first.
 */
function send(quiet: boolean): void {
  document.documentElement.toggleAttribute(FLAG_ATTR, quiet);
}

/**
 * Whether the player at the oche is throwing at a board you can hear.
 *
 * Your own throws are the obvious case, but not the only one: a friend sitting
 * next to you with an account of their own, or a guest typed into the lobby,
 * throws at the same board and is every bit as audible. Who throws in this
 * room is utils/own-board.ts's to say, which WLED and Sound FX ask as well: a
 * player at your board, or one with no board whom you put in the lobby.
 *
 * Unlike the other two, this leaves out a bot. You added it, but it throws
 * nowhere: nothing lands in the room when it throws, so its darts keep the
 * sound. Nor does it drop the sound for a player that can't be told yet.
 */
function isWithinEarshot(match: IMatch): boolean {
  const current = match.players?.[match.player];
  if (!current || isBot(current)) return false;
  return isPlayerUpInTheRoom(match, localUserId, { url: window.location.href, selected: selectedBoard() }) === true;
}

/** The site reads a bot off its PPR, and so does this. */
function isBot(player: IPlayer): boolean {
  return !!player.cpuPPR;
}
