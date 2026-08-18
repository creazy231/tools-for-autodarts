import type { IBoard } from "@/utils/board-data-storage";

import { addStyles, removeStyles } from "@/utils";
import { AutodartsToolsBoardData } from "@/utils/board-data-storage";
import { SELECTORS, qsText } from "@/utils/selectors";

/**
 * Takeout Notification — say, in the middle of the screen, that the board is
 * waiting for the darts to come out.
 *
 * The board reports this itself over the WebSocket, so nothing here reads the
 * match DOM: `autodarts.boards` carries `status: "Takeout in progress"` between
 * the last dart of a visit and the next throw. That half is identical on both
 * sites. What did not survive the rebuild is how v1 put it on screen — a Vue
 * app in a shadow root anchored at `#root > div > div:nth-of-type(2)`, a chain
 * that resolves on v2 to an empty trailing div, and a panel painted with the
 * extension's own `--adt-warning` rather than anything the site knows about.
 *
 * So this is one element in `body`, styled from the site's tokens. The shape is
 * the site's own centred dialog, measured off it: `black-90` at 80% behind,
 * a `calc(var(--radius) + 4px)` panel that zooms in from 95%, and Bebas Neue
 * uppercase. The fill is `--system-warning`/`--system-warning-on`, the pair the
 * design system reserves for exactly this — a state to wait out, not an error.
 */
const HOST_ID = "adt-takeout";
const PANEL_CLASS = "adt-takeout-panel";
const STYLE_ID = "takeout";

/** The board status that means darts are being pulled. */
const TAKEOUT_STATUS = "Takeout in progress";

const STYLES = `
  #${HOST_ID} {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    /* the site's own scrim: bg-black-90/80, mixed in oklab as Tailwind does */
    background: color-mix(in oklab, var(--color-black-90, #01040b) 80%, transparent);
    opacity: 0;
    visibility: hidden;
    transition: opacity 300ms ease, visibility 0s linear 300ms;
  }

  #${HOST_ID}[data-open] {
    opacity: 1;
    visibility: visible;
    transition: opacity 300ms ease, visibility 0s;
  }

  #${HOST_ID} .${PANEL_CLASS} {
    /* Bebas Neue sits high in its box, so the padding is not symmetrical. */
    padding: 1.125rem 2.5rem 0.875rem;
    border-radius: calc(var(--radius, 0.625rem) + 4px);
    background: var(--system-warning, #f7d458);
    color: var(--system-warning-on, #01040b);
    font-family: var(--font-display, sans-serif);
    font-weight: 500;
    font-size: clamp(2rem, 6vmin, 4rem);
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
    transform: scale(0.95);
    transition: transform 100ms ease;
  }

  #${HOST_ID}[data-open] .${PANEL_CLASS} {
    transform: scale(1);
  }

  /* One ellipsis glyph, revealed a dot at a time. */
  #${HOST_ID} .${PANEL_CLASS}::after {
    content: "\\2026";
    display: inline-block;
    width: 0;
    overflow: hidden;
    vertical-align: bottom;
    animation: adt-takeout-ellipsis steps(4, end) 900ms infinite;
  }

  @keyframes adt-takeout-ellipsis {
    to { width: 1.25em; }
  }
`;

let boardDataWatcherUnwatch: (() => void) | undefined;
let host: HTMLElement | null = null;

/**
 * Whether the notice was clicked away during the takeout still in progress.
 *
 * Without this the board decides: a takeout sends several frames, so the next
 * one after a dismissal put the notice straight back — which is what v1 did,
 * and it made the click feel broken. A dismissal now lasts as long as the
 * takeout it dismissed, and the next one shows normally.
 */
let dismissed = false;

export async function takeout() {
  console.log("Autodarts Tools: Takeout Notification");

  addStyles(STYLES, STYLE_ID);
  mount();

  update(await AutodartsToolsBoardData.getValue());

  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = AutodartsToolsBoardData.watch(update);
}

export function takeoutOnRemove() {
  console.log("Autodarts Tools: Takeout Notification removed!");

  boardDataWatcherUnwatch?.();
  boardDataWatcherUnwatch = undefined;
  host?.remove();
  host = null;
  dismissed = false;
  removeStyles(STYLE_ID);
}

function mount(): void {
  document.getElementById(HOST_ID)?.remove();

  host = document.createElement("div");
  host.id = HOST_ID;

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  panel.textContent = "Removing Darts";
  host.appendChild(panel);

  host.addEventListener("click", dismiss);
  document.body.appendChild(host);
}

function update(boardData: IBoard): void {
  const takingOut = boardData.status === TAKEOUT_STATUS;
  if (!takingOut) dismissed = false;
  show(takingOut && !dismissed);
}

function show(open: boolean): void {
  if (!host) return;
  if (open) host.setAttribute("data-open", "");
  else host.removeAttribute("data-open");
}

/**
 * Clicking the notice puts it away and tells the board to stop waiting.
 *
 * The board is the only thing that clears this status on its own, so a takeout
 * it never sees finish leaves the notice up; the site's own Reset is the way
 * out, and this saves reaching for it behind the scrim. Reset only exists while
 * a board is attached, which is also the only time this feature has anything to
 * show, so not finding it is worth a line in the console rather than silence.
 */
function dismiss(): void {
  dismissed = true;
  show(false);

  const reset = qsText<HTMLElement>(SELECTORS.match.boardReset, SELECTORS.match.boardResetText);
  if (reset) reset.click();
  else console.log("Autodarts Tools: Takeout Notification - no Reset button on screen, dismissed only");
}
