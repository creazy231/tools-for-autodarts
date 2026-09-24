/**
 * A tournament match of yours is ready: the moment autodarts' Match Ready card
 * asks you to mark ready. Sound FX plays `ambient_tournament_ready` on it and
 * WLED sets `tournament_ready`.
 *
 * Once a tournament has started, the site draws that card above the tabs of
 * the tournament's page — Information, Bracket or Rankings, whichever is open
 * — whenever one of your matches is waiting for its players: you, your
 * opponent, a board to score on, and one button reading *Mark Ready (04:59)*,
 * the ready-up counting down in brackets, which reads *Mark Unready* once
 * pressed. The site draws it from an event on a WebSocket topic of your own,
 * or from a request when the page is opened with a ready-up already running,
 * so the card covers both. Away from the tournament's page the site shows a
 * toast instead, and it deletes that notification as soon as you open the page.
 *
 * The button is found by its label, in each language the site ships, and by
 * the countdown it carries, which no other button on the page has. So a
 * wording not in the lists — a language added later, or a relabel — still
 * counts as asking you to mark ready; only the wordings for taking it back
 * mean the ready-up has already been answered.
 *
 * This used to be the words "Time to ready up", which the rebuilt site never
 * writes, and then the `tournament:match-ready` notification, read as though
 * it were the whole frame when the site wraps it in `{ status, notification }`
 * — so nothing matched either way.
 */

import { SELECTORS } from "./selectors";

/** The ready-up's countdown, "(04:59)", which the site writes into the button. */
const COUNTDOWN = /\(\s*\d+:\d{2}\s*\)/;

export interface ReadyUp {
  button: HTMLButtonElement;
  /** False once you have marked ready and the button offers to take it back. */
  asksToMarkReady: boolean;
}

/** The Match Ready card's button, or null while no match of yours is waiting for its players. */
export function findReadyUp(root: ParentNode = document): ReadyUp | null {
  const markReady = SELECTORS.tournament.markReadyText.map(fold);
  const markUnready = SELECTORS.tournament.markUnreadyText.map(fold);

  // Every candidate in turn, rather than the first that matches anything: a
  // card of some other kind on the page must not hide the button from the next.
  for (const selector of SELECTORS.tournament.readyUpButton) {
    for (const button of root.querySelectorAll<HTMLButtonElement>(selector)) {
      const text = button.textContent ?? "";
      const label = fold(text.replace(COUNTDOWN, ""));
      if (markUnready.includes(label)) return { button, asksToMarkReady: false };
      if (markReady.includes(label) || COUNTDOWN.test(text)) return { button, asksToMarkReady: true };
    }
  }
  return null;
}

/**
 * Calls `onReady` each time a ready-up comes up asking you to mark ready, and
 * returns the function that stops watching.
 *
 * Once per ready-up: the countdown ticking, and marking ready and unready
 * again, are all the same one. It is over when the button goes — both of you
 * ready, the time up, the match started or called off — and the next one to
 * come up calls again. One already answered when first seen, as after a
 * reload, is left alone.
 */
export function watchTournamentReady(onReady: () => void): () => void {
  let shown = false;

  const check = () => {
    const readyUp = findReadyUp();
    if (!readyUp) {
      shown = false;
      return;
    }
    if (shown) return;
    shown = true;
    if (readyUp.asksToMarkReady) onReady();
  };

  // The card comes and goes as a whole, which is all this needs to see; the
  // label and the countdown change inside it every second.
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  check();

  return () => observer.disconnect();
}

/**
 * A tournament's own page, `/tournaments/<id>` and its tabs: where the card is
 * drawn. The id is a UUID, which keeps out `/tournaments/create` and the like.
 */
export function isTournamentPage(url: string = window.location.href): boolean {
  return /\/tournaments\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}(?:[/?#]|$)/i.test(url);
}

function fold(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}
