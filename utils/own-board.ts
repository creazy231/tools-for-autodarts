/**
 * Who throws in this room: whose darts land on the board in front of this
 * browser, as against those thrown somewhere else and only shown on screen.
 *
 * Three features ask it. Quiet Own Darts drops the site's thud for the darts
 * you can already hear, WLED plays `other` while somebody elsewhere is up, and
 * Sound FX plays `opponent_throw` for a dart thrown elsewhere. They used to
 * answer it three ways, and the Sound FX one never counted an opponent's guest.
 *
 * Nothing here reads the page: the caller says who you are, where the page is
 * and which board the site autoscores with, so the rule runs headless too.
 */

/** A seat in a match or a lobby, as far as the room is concerned. */
export interface Seat {
  userId?: string | null;
  hostId?: string | null;
  boardId?: string | null;
}

/** Where this browser is. */
export interface Here {
  /** The page's address: a board page names its board. */
  url: string;
  /**
   * The board the site autoscores with in this browser — `selectedBoard()` of
   * utils/lobby-guests.ts, which is none while that is `manual`.
   */
  selected?: string | null;
}

/**
 * A seat that is yours: your own account, or one you put in the lobby. `hostId`
 * names the account controlling a seat, which for a guest or a bot is whoever
 * added them, and for a remote player their own account.
 */
export function isYours(seat: Seat, me: string | null | undefined): boolean {
  return !!me && (seat.userId === me || seat.hostId === me);
}

/**
 * The board this browser is in front of: the one a board page names, whoever
 * is signed in; else the one the site autoscores with here; else the board of
 * the first of your seats that names one.
 *
 * The site's own choice comes before your seat for an account with more than
 * one board. Its seat is on one of them, while each browser autoscores the
 * board it stands at.
 */
export function ownBoard(seats: readonly Seat[] | undefined, me: string | null | undefined, here: Here): string | undefined {
  const watched = here.url.match(/\/boards\/([0-9a-f-]+)/i)?.[1];
  if (watched) return watched;
  if (here.selected) return here.selected;
  return seats?.find(seat => isYours(seat, me) && !!seat.boardId)?.boardId ?? undefined;
}

/**
 * Whether `seat` throws in this room, against `board`, ownBoard's answer.
 *
 * A seat with a board throws in this room when it is that board: a friend with
 * an account of their own at your board does, and nobody at another board
 * does, your own account included when it has more than one. With no board
 * here at all you score by hand, since a seat of yours would have named one,
 * and every board is somewhere else. A seat with no board is a guest or a bot,
 * or somebody scoring by hand, and throws here when it is yours: you added the
 * guest, the bot plays your match.
 *
 * `undefined` while that can't be told, for want of your account: it comes out
 * of the access token, which is captured from the page's traffic and can land
 * after the match does.
 */
export function isInTheRoom(seat: Seat, me: string | null | undefined, board: string | undefined): boolean | undefined {
  if (seat.boardId) {
    if (board) return seat.boardId === board;
    return me ? false : undefined;
  }
  if (!me) return undefined;
  return isYours(seat, me);
}

/** Whether the player up in `match` throws in this room (isInTheRoom); `undefined` without one. */
export function isPlayerUpInTheRoom(
  match: { player: number; players?: readonly Seat[] } | undefined,
  me: string | null | undefined,
  here: Here,
): boolean | undefined {
  const seat = match?.players?.[match.player];
  if (!seat) return undefined;
  return isInTheRoom(seat, me, ownBoard(match.players, me, here));
}
