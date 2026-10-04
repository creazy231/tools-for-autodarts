/**
 * Local Lobby's row logic (entrypoints/lobby.content/local-lobby.ts), apart
 * from the page so a test can run it.
 */

import { SELECTORS, qs } from "@/utils/selectors";

/**
 * The 🌐 buttons to press to pull every player onto this board: the site's
 * "play on my board" (`setHostForIndex`), on each row whose seat someone else
 * hosts. A pressed seat is hosted here, and its row no longer has one, so
 * running this on every render needs no bookkeeping. The house on a row is
 * the opposite, unlink (`removeHostForIndex`), and is never pressed. Rows come
 * in seat order; `keep` holds seats that stay where they are.
 */
export function boardButtonsToPress(rows: readonly Element[], seatIds: readonly (string | undefined)[], keep: ReadonlySet<string>): HTMLButtonElement[] {
  const out: HTMLButtonElement[] = [];
  rows.forEach((row, index) => {
    if (keep.has(seatIds[index] ?? "")) return;
    const button = qs<HTMLButtonElement>(SELECTORS.lobby.playerLinkButton, row);
    if (button && !button.disabled) out.push(button);
  });
  return out;
}
