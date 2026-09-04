import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IMatch, IPlayer } from "@/utils/websocket-helpers";

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
 * throws at the same board and is every bit as audible.
 *
 * Who counts as you is decided the way autodarts decides whose turn it is: a
 * player is yours if the account is yours, or if you are the one who put them
 * in the lobby — `hostId`, which is what a guest carries in place of an
 * account. It is also all a guest carries. A guest has no board in the match
 * data, not even an empty field, so going by the board alone left every
 * guest's dart sounding from the board in front of you. The board still
 * settles the friend with an account of their own, who shares your board and
 * nothing else; your own account is the one case that needs no board at all,
 * since a match played without one still knows who you are.
 *
 * A bot is hosted by you as well, and throws nowhere: nothing lands in the
 * room when it throws, so its darts keep the sound.
 */
function isWithinEarshot(match: IMatch): boolean {
  const current = match.players?.[match.player];
  if (!current || isBot(current)) return false;
  if (isMine(current)) return true;

  const board = ownBoardId(match);
  return !!board && current.boardId === board;
}

/** Your own account, or a player you put into the lobby yourself. */
function isMine(player: IPlayer): boolean {
  return !!localUserId && (player.userId === localUserId || player.hostId === localUserId);
}

/** The site reads a bot off its PPR, and so does this. */
function isBot(player: IPlayer): boolean {
  return !!player.cpuPPR;
}

/** The board whose darts this browser is sitting in front of. */
function ownBoardId(match: IMatch): string | undefined {
  // Watching a board directly names it in the URL, and that is the board being
  // watched whoever happens to be signed in.
  const watched = window.location.href.match(/\/boards\/([0-9a-f-]+)/)?.[1];
  if (watched) return watched;

  // The first of your players that names a board — your own seat, or a friend
  // you added who plays on your board with an account of their own. Guests
  // name none, which is why the field is asked for.
  const mine = match.players?.find(player => isMine(player) && !isBot(player) && !!player.boardId)?.boardId;
  if (mine) return mine;

  // Nobody in the match is you — someone else is playing on your board while
  // you watch. `selectedBoard` is the site's own note of which board this
  // browser is pointed at.
  return localStorage.getItem("selectedBoard") ?? undefined;
}
