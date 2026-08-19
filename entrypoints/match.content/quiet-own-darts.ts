import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";
import type { IMatch } from "@/utils/websocket-helpers";

import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsa } from "@/utils/selectors";
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
 * Its switch goes in autodarts' own In Game Settings, directly under the Dart
 * landed setting it qualifies — the extension's settings page is a screen away
 * from a live match, and this is a thing you reach for mid-leg.
 */

/** Event the page-world half listens on. See entrypoints/quiet-own-darts.ts. */
const FLAG_EVENT = "adt-quiet-own-darts";

/** Marks our row in the site's settings dialog. */
const ROW_FLAG = "data-adt-quiet-own-darts";

/**
 * Marks the site's row we sit under, so recognising it again costs one
 * attribute read rather than another walk of the dialog — and so a re-render
 * that replaces it says so by taking the mark with it.
 */
const ANCHOR_FLAG = "data-adt-quiet-own-darts-anchor";

/**
 * The site ships English only — `assets/i18n-*.js` registers `en` and `en-dev`
 * and falls back to them for every other language — so this is the whole list
 * today. Anything it misses lands on {@link rowByStructure} instead.
 */
const DART_LANDED_LABELS = [ "dart landed" ];

let gameDataWatcherUnwatch: (() => void) | undefined;
let configWatcherUnwatch: (() => void) | undefined;
let dialogObserver: MutationObserver | null = null;
let injected = false;
let localUserId: string | null = null;
let enabled = true;
let quiet = false;

export async function quietOwnDarts(): Promise<void> {
  console.log("Autodarts Tools: Quiet Own Darts");

  if (!injected) {
    await injectScript("/quiet-own-darts.js", { keepInDom: true });
    injected = true;
  }

  const config: IConfig = await AutodartsToolsConfig.getValue();
  enabled = config.quietOwnDarts?.enabled ?? true;

  await apply(await AutodartsToolsGameData.getValue());

  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = AutodartsToolsGameData.watch(apply);

  // The switch is one control with two homes: the dialog it is drawn in, and
  // the stored config. Someone editing the config elsewhere — a second tab, an
  // import — should not leave the dialog showing the old position.
  configWatcherUnwatch?.();
  configWatcherUnwatch = AutodartsToolsConfig.watch((next: IConfig) => {
    const value = next.quietOwnDarts?.enabled ?? true;
    if (value === enabled) return;
    enabled = value;
    paintRow();
    void apply(undefined);
  });

  dialogObserver?.disconnect();
  dialogObserver = new MutationObserver(injectRow);
  dialogObserver.observe(document.body, { childList: true, subtree: true });
  injectRow();
}

export function quietOwnDartsOnRemove(): void {
  gameDataWatcherUnwatch?.();
  gameDataWatcherUnwatch = undefined;
  configWatcherUnwatch?.();
  configWatcherUnwatch = undefined;
  dialogObserver?.disconnect();
  dialogObserver = null;
  document.querySelector(`[${ROW_FLAG}]`)?.remove();
  document.querySelector(`[${ANCHOR_FLAG}]`)?.removeAttribute(ANCHOR_FLAG);
  // The page-world patch outlives this teardown, so leaving the flag set would
  // go on swallowing the sound with nothing left to switch it back.
  send(false);
}

// ------------------------------------------------------------------ the flag

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

// ------------------------------------------------------------------- the row

/**
 * Keep our switch directly under the site's Dart landed switch, for as long as
 * that switch is on screen.
 *
 * Runs on every mutation batch the match screen produces, so both of the
 * states it spends its life in cost one `querySelector`: no row and no dialog,
 * or a row still sitting where it was put.
 */
function injectRow(): void {
  const existing = document.querySelector(`[${ROW_FLAG}]`);
  if (existing?.previousElementSibling?.hasAttribute(ANCHOR_FLAG)) return;

  const dialog = qs(SELECTORS.match.settingsDialog);
  const anchor = dialog ? dartLandedRow(dialog) : null;

  // Switching the site's own Play sound effects off takes every per-effect row
  // with it. Ours qualifies one of those, so it goes too — left behind it would
  // sit under a heading that no longer has anything for it to modify.
  if (!anchor) {
    existing?.remove();
    return;
  }

  existing?.remove();
  anchor.after(buildRow(anchor));
  anchor.setAttribute(ANCHOR_FLAG, "");
  paintRow();
}

/**
 * The site's own Dart landed row, by its label first and by where it sits in
 * the dialog second.
 *
 * Both halves of the Sound Effects group are needed for the fallback: it is
 * the only group with a volume control between its switches, and Dart landed
 * is the first switch after that control.
 */
function dartLandedRow(dialog: Element): HTMLElement | null {
  const rows = qsa<HTMLElement>(SELECTORS.match.settingsSwitch, dialog)
    .map(row => row.parentElement)
    .filter((row): row is HTMLElement => !!row);

  const byLabel = rows.find((row) => {
    const label = row.querySelector("label")?.textContent?.trim().toLowerCase();
    return !!label && DART_LANDED_LABELS.includes(label);
  });

  return byLabel ?? rowByStructure(rows);
}

function rowByStructure(rows: HTMLElement[]): HTMLElement | null {
  const group = rows.map(row => row.parentElement).find(group =>
    !!group && [ ...group.children ].filter(child => rows.includes(child as HTMLElement)).length >= 4,
  );
  if (!group) return null;

  const children = [ ...group.children ] as HTMLElement[];
  const afterGap = children.findIndex((child, i) => i > 0 && rows.includes(child) && !rows.includes(children[i - 1]));
  return afterGap > 0 ? children[afterGap] : null;
}

/**
 * A copy of the row it sits under, relabelled.
 *
 * Cloning rather than writing the markup out means the row is styled by
 * whatever classes the site is using this week, in a dialog whose every class
 * is a Tailwind utility that a redesign would renumber. What the clone does
 * not bring is React — the switch it copies is bound to a fiber the clone has
 * no part in — so the state it shows and the click that changes it are ours.
 */
function buildRow(template: HTMLElement): HTMLElement {
  const row = template.cloneNode(true) as HTMLElement;
  row.setAttribute(ROW_FLAG, "");
  row.removeAttribute(ANCHOR_FLAG);

  // The hidden checkbox behind each switch is the site's form plumbing, and its
  // id is referenced by the label; a copy of either is a duplicate id.
  row.querySelectorAll("input").forEach(input => input.remove());
  row.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  row.querySelectorAll("[aria-labelledby]").forEach(el => el.removeAttribute("aria-labelledby"));

  const label = row.querySelector("label");
  if (label) {
    label.removeAttribute("for");
    label.textContent = "Only on others' turns";
    const note = document.createElement("p");
    note.className = "text-xs text-muted-foreground";
    note.textContent = "Tools for Autodarts";
    label.after(note);
  }

  const control = qs<HTMLElement>(SELECTORS.match.settingsSwitch, row);
  if (control) {
    // The clone keeps role="switch" and tabindex="0" from the original but not
    // the component that made them mean anything, so both the name a screen
    // reader reads out and the keys that work it have to be put back.
    control.setAttribute("aria-label", "Play the dart landed sound only on other players' turns");
    control.addEventListener("click", (event) => {
      event.preventDefault();
      void toggle();
    });
    control.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (key !== " " && key !== "Enter") return;
      event.preventDefault();
      void toggle();
    });
  }

  return row;
}

async function toggle(): Promise<void> {
  enabled = !enabled;
  paintRow();
  await apply(undefined);

  const config: IConfig = await AutodartsToolsConfig.getValue();
  await AutodartsToolsConfig.setValue({ ...config, quietOwnDarts: { enabled } });
}

/**
 * Show the switch in the position we hold it in.
 *
 * The site draws its switches off `data-checked` / `data-unchecked` — every
 * colour and the thumb's travel is a Tailwind variant keyed on one or the
 * other — so setting them is the whole of it.
 */
function paintRow(): void {
  const row = document.querySelector(`[${ROW_FLAG}]`);
  if (!row) return;

  const control = qs<HTMLElement>(SELECTORS.match.settingsSwitch, row);
  if (!control) return;

  for (const el of [ control, qs<HTMLElement>(SELECTORS.match.settingsSwitchThumb, control) ]) {
    if (!el) continue;
    el.toggleAttribute("data-checked", enabled);
    el.toggleAttribute("data-unchecked", !enabled);
  }
  control.setAttribute("aria-checked", String(enabled));
}
