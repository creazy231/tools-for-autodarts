import type { IConfig } from "@/utils/storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs, qsa } from "@/utils/selectors";

/**
 * Quiet Own Darts — the switch.
 *
 * The feature itself lives in entrypoints/match.content/quiet-own-darts.ts;
 * this is only the control that turns it on and off, and it is drawn into
 * autodarts' own sound settings rather than onto a card of the extension's.
 *
 * There are two places to put it, because autodarts has two: the In Game
 * Settings dialog behind the gear in a match, and /settings/sound-effects,
 * which is where you go when you are not in one. Both list the same effects
 * and both mark their switches with `data-slot="switch"`, but they lay them
 * out differently — the dialog stacks every switch in one group, while the
 * settings page gives each effect a block of its own holding the switch and
 * its variant buttons. So the row goes in as the last thing in that block
 * where there is one, and directly after the switch where there is not; both
 * come out directly under Dart landed with nothing of the site's split up.
 *
 * Mounted from entrypoints/content/index.ts, which is the one content script
 * that runs on every autodarts page and so sees both.
 */

/** Marks our row. */
const ROW_FLAG = "data-adt-quiet-own-darts";

/**
 * The site ships English only — `assets/i18n-*.js` registers `en` and `en-dev`
 * and falls back to them for every other language — so this is the whole list
 * today. Anything it misses lands on {@link rowByStructure} instead.
 */
const DART_LANDED_LABELS = [ "dart landed" ];

let observer: MutationObserver | null = null;
let configWatcherUnwatch: (() => void) | undefined;
let enabled = false;

export async function quietOwnDartsSwitch(): Promise<void> {
  const config: IConfig = await AutodartsToolsConfig.getValue();
  enabled = config.quietOwnDarts?.enabled ?? false;

  // One control with two homes, and now two places it can be drawn. Whichever
  // of them is on screen should show the position the other one just set.
  configWatcherUnwatch?.();
  configWatcherUnwatch = AutodartsToolsConfig.watch((next: IConfig) => {
    const value = next.quietOwnDarts?.enabled ?? false;
    if (value === enabled) return;
    enabled = value;
    paintRow();
  });

  observer?.disconnect();
  observer = new MutationObserver(injectRow);
  observer.observe(document.body, { childList: true, subtree: true });
  injectRow();
}

export function quietOwnDartsSwitchOnRemove(): void {
  observer?.disconnect();
  observer = null;
  configWatcherUnwatch?.();
  configWatcherUnwatch = undefined;
  document.querySelector(`[${ROW_FLAG}]`)?.remove();
}

/**
 * Keep our switch under the site's Dart landed switch, for as long as that
 * switch is on screen.
 *
 * Runs on every mutation batch the page produces, and works the anchor out
 * from scratch each time. Marking the anchor instead and trusting the mark is
 * both cheaper and wrong: React reuses these rows rather than replacing them,
 * so switching the site's own Play sound effects off — which drops every
 * per-effect row — left the mark on a node that had become the Play sound
 * effects row itself, and our switch sat happily under the wrong setting.
 *
 * The walk is a `querySelectorAll` over one attribute, and the sound settings
 * are on screen for a few seconds at a time, so this costs nothing worth
 * chasing.
 */
function injectRow(): void {
  const existing = document.querySelector<HTMLElement>(`[${ROW_FLAG}]`);
  const anchor = dartLandedRow();

  // Switching the site's own Play sound effects off takes every per-effect row
  // with it. Ours qualifies one of those, so it goes too — left behind it would
  // sit under a heading that no longer has anything for it to modify.
  if (!anchor) {
    existing?.remove();
    return;
  }

  if (existing && isPlaced(existing, anchor)) return;

  existing?.remove();
  const row = buildRow(anchor);
  if (!row) return;

  if (ownBlock(anchor)) anchor.parentElement!.append(row);
  else anchor.after(row);
  paintRow();
}

/**
 * Whether the row is still where the layout it went into wants it: after the
 * anchor in the dialog, last in the anchor's block on the settings page.
 *
 * Asking only the first of those cost a hung tab — appended after the variant
 * buttons, the row's previous sibling is that grid rather than the anchor, so
 * the answer was always no and every mutation tore the row out and put it
 * back, which mutated, which ran this again.
 */
function isPlaced(row: HTMLElement, anchor: HTMLElement): boolean {
  return ownBlock(anchor) ? row.parentElement === anchor.parentElement : row.previousElementSibling === anchor;
}

/**
 * Whether this switch has a block to itself, holding it and its variant
 * buttons — which is how /settings/sound-effects lays an effect out, and never
 * how the dialog does: there one group holds every switch on the panel.
 *
 * Our own row does not count towards that, or adding it would change the
 * answer and send the next pass down the other branch.
 */
function ownBlock(row: HTMLElement): boolean {
  const parent = row.parentElement;
  if (!parent) return false;
  if (qsa(SELECTORS.soundSettings.switch, parent).filter(isSiteOwned).length !== 1) return false;

  // And something of the site's beside it, which is the variant buttons. Switch
  // the dialog's Play sound effects off and every effect row goes, leaving that
  // master switch alone in its group and looking exactly like a block of its
  // own — which had our row settling in underneath it.
  return [ ...parent.children ].filter(isSiteOwned).length > 1;
}

function isSiteOwned(el: Element): boolean {
  return !el.closest(`[${ROW_FLAG}]`);
}

/**
 * How many switches have to be on screen before shape is worth reading.
 *
 * Both places that list sound effects list several — the settings page shows
 * six, and the dialog its master switch and one per effect. Nowhere else on the
 * site comes close: the lobby has a single Autoscoring switch, and
 * /settings/general two. It is also the floor the group branch of
 * {@link rowByStructure} already went by, so both halves now assume the same
 * thing.
 */
const MIN_SOUND_SWITCHES = 4;

/**
 * The site's own Dart landed row, by its label first and by shape second.
 *
 * Shape is only consulted where the sound settings actually are. It used to be
 * consulted on every page this script runs on, which is all of them, and the
 * lobby has a lone Autoscoring switch sitting beside its description — the
 * exact shape {@link ownBlock} looks for. So creating a game showed two
 * Autoscoring rows: a copy of a control that is not a sound effect at all,
 * still wearing the site's own wording because that row carries no `<label>`
 * for {@link buildRow} to rewrite.
 */
function dartLandedRow(): HTMLElement | null {
  const rows = qsa<HTMLElement>(SELECTORS.soundSettings.switch)
    .filter(isSiteOwned)
    .map(control => control.parentElement)
    .filter((row): row is HTMLElement => !!row);

  const byLabel = rows.find((row) => {
    const label = row.querySelector("label")?.textContent?.trim().toLowerCase();
    return !!label && DART_LANDED_LABELS.includes(label);
  });
  if (byLabel) return byLabel;

  return rows.length >= MIN_SOUND_SWITCHES ? rowByStructure(rows) : null;
}

/**
 * Where to go when the label is in a language the list above does not have.
 *
 * Dart landed comes first among the per-effect switches in both layouts. What
 * separates those from the Play sound effects switch above them differs: on
 * the settings page each has a block of its own, and in the dialog they are
 * the switches that follow the volume control.
 */
function rowByStructure(rows: HTMLElement[]): HTMLElement | null {
  const blocked = rows.find(ownBlock);
  if (blocked) return blocked;

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
 * whatever classes the site is using this week — and by the right ones of the
 * two sets, since the dialog and the settings page do not share them. What the
 * clone does not bring is React: the switch it copies is bound to a fiber the
 * clone has no part in, so the state it shows and the click that changes it
 * are ours.
 */
function buildRow(template: HTMLElement): HTMLElement | null {
  // A row with no label is one we cannot rename, and a copy of a switch wearing
  // the site's own wording is worse than no switch at all — it reads as the
  // site listing the same setting twice, which is what a lone Autoscoring
  // switch in the lobby turned into. The anchor above should never be one of
  // those any more; this is here so that it cannot become one again.
  if (!template.querySelector("label")) return null;

  const row = template.cloneNode(true) as HTMLElement;
  row.setAttribute(ROW_FLAG, "");

  // The hidden checkbox behind each switch is the site's form plumbing, and its
  // id is referenced by the label; a copy of either is a duplicate id.
  row.querySelectorAll("input").forEach(input => input.remove());
  row.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  row.querySelectorAll("[aria-labelledby]").forEach(el => el.removeAttribute("aria-labelledby"));

  const label = row.querySelector("label");
  if (label) {
    label.removeAttribute("for");
    label.textContent = "Only on others' turns";
    // Inside the label rather than beside it: the dialog stacks its label in a
    // column that a sibling would join, and the settings page lays its label
    // and switch out in a row that a sibling would land in the middle of.
    const note = document.createElement("span");
    note.className = "block text-xs font-normal text-muted-foreground";
    note.textContent = "Tools for Autodarts";
    label.append(note);
  }

  const control = qs<HTMLElement>(SELECTORS.soundSettings.switch, row);
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

  const control = qs<HTMLElement>(SELECTORS.soundSettings.switch, row);
  if (!control) return;

  for (const el of [ control, qs<HTMLElement>(SELECTORS.soundSettings.switchThumb, control) ]) {
    if (!el) continue;
    el.toggleAttribute("data-checked", enabled);
    el.toggleAttribute("data-unchecked", !enabled);
  }
  control.setAttribute("aria-checked", String(enabled));
}
