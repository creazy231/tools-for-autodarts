/**
 * Local Lobby's row logic (entrypoints/lobby.content/local-lobby.ts), apart
 * from the page so a test can run it.
 */

import { SELECTORS, qs } from "@/utils/selectors";

/**
 * How long a seat is left where it is before it is pulled onto this board. A
 * row turns up as soon as its seat does, and Online Teams hears from the other
 * account's Tools a moment later whether the seat is one of its teams', which
 * stays on that account's board.
 */
export const CLAIM_GRACE_MS = 3000;

/**
 * The 🌐 buttons to press to pull every player onto this board: the site's
 * "play on my board" (`setHostForIndex`), on each row whose seat someone else
 * hosts and that was first seen CLAIM_GRACE_MS ago or longer. A pressed seat is
 * hosted here, and its row no longer has one, so running this on every render
 * needs no bookkeeping. The house on a row is the opposite, unlink
 * (`removeHostForIndex`), and is never pressed. Rows come in seat order; `keep`
 * holds seats that stay where they are.
 */
export function boardButtonsToPress(rows: readonly Element[], seatIds: readonly (string | undefined)[], keep: ReadonlySet<string>, seenAt: ReadonlyMap<string, number>, now: number): HTMLButtonElement[] {
  const out: HTMLButtonElement[] = [];
  rows.forEach((row, index) => {
    const id = seatIds[index] ?? "";
    const since = seenAt.get(id);
    if (keep.has(id) || since === undefined || now - since < CLAIM_GRACE_MS) return;
    const button = qs<HTMLButtonElement>(SELECTORS.lobby.playerLinkButton, row);
    if (button && !button.disabled) out.push(button);
  });
  return out;
}
