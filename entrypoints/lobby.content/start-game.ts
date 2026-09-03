/**
 * The lobby's Start Game button, for the features that press it or watch it.
 *
 * The site gives this button no id, data-slot of its own or aria-label, and
 * its label is not one thing: it reads "Start Game" when the lobby can start,
 * "Needs at least N players" while it cannot, and "Waiting for players..."
 * while someone is still joining — all through the language switcher. Matching
 * the label therefore found the button only in English and only once the lobby
 * was ready to go, which is why Auto Start used to mount nothing in a lobby
 * that was still filling up.
 *
 * What is stable is where it sits: alone in the `max-w-80` box the site uses
 * to centre it at the foot of the lobby, as the one full-width, 48px-high
 * button on the page. Both are in the registry, with the label kept as the
 * last resort for a redesign that drops the pair — see SELECTORS.lobby.
 *
 * The site renders a `<p>` in the same place for everyone but the host, so
 * finding nothing is the normal answer in a lobby you did not open.
 */

import { SELECTORS, qs, qsText } from "@/utils/selectors";

/** The button, whatever it currently says, or null when this user cannot start the game. */
export function startGameButton(): HTMLButtonElement | null {
  return qs<HTMLButtonElement>(SELECTORS.lobby.startGameButton)
    ?? qsText<HTMLButtonElement>(SELECTORS.lobby.anyButton, SELECTORS.lobby.startGameText);
}

/** Whether the button is on screen and the site is letting it be pressed. */
export function canStartGame(): boolean {
  const button = startGameButton();
  return !!button && !button.disabled;
}

/** Poll for the button; resolves null when it never turns up. */
export async function waitForStartGameButton(timeout = 10000): Promise<HTMLButtonElement | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const button = startGameButton();
    if (button) return button;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}
