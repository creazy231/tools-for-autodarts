/**
 * The note under autodarts' Language setting: picking a language there picks
 * it for Tools too (utils/i18n/site-language.ts).
 *
 * It sits inside the site's Language field on /settings/general, under the
 * select, the way the switches below it carry their own descriptions, and it
 * copies the classes of one of those descriptions so it is styled by whatever
 * the site uses this week. It is found by the select's id, which the site sets
 * in its own source, and failing that by the field's label in the site's
 * words. Where neither is on screen there is no note: it never guesses a place.
 *
 * The user menu has a language item too, which writes the same setting. It
 * gets no note: it is a one-line row with a "Deutsch erkannt" subline and no
 * room for one.
 *
 * Mounted from entrypoints/content/index.ts, the content script that runs on
 * every page, which shares the tab's live language with it: the note changes
 * with the page when a language is picked.
 */

import { onLanguageChange, t } from "./i18n";
import { SELECTORS, qs, qsa } from "./selectors";

/** Marks our note. */
const NOTE_FLAG = "data-adt-language-note";

/** The site's label for its Language setting, in each language it ships, lower-cased. */
const LANGUAGE_LABELS = [ "language", "sprache", "taal" ];

/** The site's description classes on 2026-10-01, for a page with no description to copy. */
const FALLBACK_CLASSES = "text-muted-foreground text-left text-sm leading-normal font-normal";

let observer: MutationObserver | null = null;
let stopListening: (() => void) | null = null;
/**
 * The note once placed. The observer runs on every page, match pages
 * included, so outside /settings it drops this one rather than search the
 * whole document for a note on each change.
 */
let placed: HTMLElement | null = null;

export function languageNote(): void {
  languageNoteOnRemove();
  observer = new MutationObserver(() => {
    // The Language setting only exists under /settings; nothing to look for elsewhere.
    if (globalThis.location?.pathname.startsWith("/settings")) placeNote();
    else removeNote();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  stopListening = onLanguageChange(() => paint());
  placeNote();
}

export function languageNoteOnRemove(): void {
  observer?.disconnect();
  observer = null;
  stopListening?.();
  stopListening = null;
  removeNote();
}

/** The site's Language field: by the select's id, else by the field's label. */
export function languageField(root: ParentNode = document): HTMLElement | null {
  const select = qs(SELECTORS.siteSettings.languageSelect, root);
  const byId = select?.closest<HTMLElement>(SELECTORS.siteSettings.field.join(","));
  if (byId) return byId;

  return qsa(SELECTORS.siteSettings.field, root).find((field) => {
    const label = qs(SELECTORS.siteSettings.fieldLabel, field)?.textContent?.trim().toLowerCase();
    return !!label && LANGUAGE_LABELS.includes(label);
  }) ?? null;
}

/**
 * Put the note in the Language field, or take it away when there is none.
 * Runs on every mutation batch on /settings; once the note is in place it
 * only checks. It looks in `root` for a flagged note because an earlier copy
 * of this script (before an extension update) may have left one: that one is
 * kept if it sits in the right field, and taken over as ours, else removed.
 */
export function placeNote(root: ParentNode = document): void {
  const field = languageField(root);
  const existing = root.querySelector<HTMLElement>(`[${NOTE_FLAG}]`);
  if (!field) {
    existing?.remove();
    placed = null;
    return;
  }
  if (existing?.parentElement === field) {
    placed = existing;
    paint(existing);
    return;
  }

  existing?.remove();
  const note = document.createElement("p");
  note.setAttribute(NOTE_FLAG, "");
  note.className = qs(SELECTORS.siteSettings.fieldDescription, root)?.className || FALLBACK_CLASSES;
  field.append(note);
  placed = note;
  paint(note);
}

/** Take away the note we placed. A reference, not a search: this runs on every page. */
function removeNote(): void {
  placed?.remove();
  placed = null;
}

/** The note's text in the current language. Writes only when it differs, so it never feeds the observer. */
function paint(note: HTMLElement | null = placed): void {
  const text = t("site.languageNote");
  if (note && note.textContent !== text) note.textContent = text;
}
