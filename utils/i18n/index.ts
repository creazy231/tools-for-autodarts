/**
 * Tools' text in the language autodarts is showing.
 *
 * `t("zoom.position.title")` returns the text for a key, from the catalogs in
 * locales/, in the language worked out by ./site-language.ts. It reads a
 * reactive value, so a template or `computed` that calls it updates by itself
 * when the language changes. Code that wrote text into the page once uses
 * `onLanguageChange` instead. How to add text: CLAUDE.md, "Translations".
 *
 * Each content-script bundle runs its own copy of this module, and each copy
 * follows the site by itself:
 * - when it is first imported, it reads the site's setting;
 * - after any click, key press or change in the tab, it reads the key again.
 *   Both of the site's pickers write it synchronously, inside the event that
 *   picks, so a value that differs from the one read at the start of the event
 *   is a change made in this tab.
 *
 * A change made in another tab happens outside any event here, so it is left
 * alone: the site keeps showing this tab's language until the tab reloads, and
 * Tools stays with it. (One case slips through: this tab re-picking the very
 * language another tab already stored leaves the key unchanged, so Tools here
 * waits for a reload. See the spec, §1, "Known limit".)
 *
 * The site's debug switch, `sessionStorage["autodarts.i18n.debug"] = "true"`
 * plus a reload, renders every label of the site as its key. Tools does the
 * same, so any English left on screen is text that bypasses the catalogs.
 *
 * Never import this from a module the service worker loads (utils/storage.ts
 * and what it imports): it would carry every catalog into background.js.
 */

import { readonly, ref } from "vue";

import { CATALOGS } from "../../locales";

import { interpolate, isPlural, messageText, stripMarkup } from "./format";
import { readSiteLanguage, readStoredLanguage } from "./site-language";

import type { Ref } from "vue";
import type { Catalog } from "../../locales";
import type { Language } from "./site-language";
import type { Message, MessagePath, Params } from "./types";

export { LANGUAGES, SITE_LANGUAGE_KEY, normaliseLanguage, readSiteLanguage } from "./site-language";
export type { Language } from "./site-language";
export type { Params, Plural } from "./types";

/** Every key the English catalog has. */
export type MessageKey = MessagePath<Catalog>;

/** The site's switch for showing keys instead of text, per tab. */
export const DEBUG_KEY = "autodarts.i18n.debug";

/** The events after which the site's language may have been changed in this tab. */
const PICKING_EVENTS = [ "pointerup", "click", "keydown", "change" ] as const;

/** A second look, for a select that commits its value a frame after the event. */
const LATE_CHECK_MS = 250;

const current = ref<Language>(readSiteLanguage());
const listeners = new Set<(language: Language) => void>();
const debug = readDebug();

/** The language Tools is showing. Read-only: it follows the site. */
export const language: Readonly<Ref<Language>> = readonly(current);

/**
 * The text for a key: a plural's form picked by `params.count`, `{name}`
 * placeholders filled, inline tags dropped. The key itself in debug mode.
 */
export function t(key: MessageKey, params?: Params): string {
  const source = rawText(key, params);
  return debug ? source : interpolate(stripMarkup(source), params);
}

/**
 * The text for a key with its markup and placeholders still in it, for
 * <AppTrans>, which renders both itself. The key itself in debug mode, and
 * for a key no catalog has.
 */
export function rawText(key: MessageKey, params?: Params): string {
  // Read first, whatever happens next: it is what makes a caller reactive.
  const lang = current.value;
  if (debug) return key;

  const message = lookup(CATALOGS[lang], key) ?? lookup(CATALOGS.en, key);
  return message === undefined ? key : messageText(message, params, lang);
}

/**
 * Names joined the way the language joins a list: "A, B and C", "A, B und C",
 * "A, B en C". English is British, like the rest of Tools' English: no comma
 * before the "and".
 */
export function list(names: readonly string[]): string {
  const lang = current.value;
  return new Intl.ListFormat(lang === "en" ? "en-GB" : lang, { type: "conjunction" }).format(names);
}

/** Calls `callback` with the new language whenever it changes. Returns the function that stops it. */
export function onLanguageChange(callback: (language: Language) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function lookup(catalog: unknown, key: string): Message | undefined {
  let node: unknown = catalog;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" || isPlural(node) ? node : undefined;
}

function readDebug(): boolean {
  try {
    return globalThis.sessionStorage?.getItem(DEBUG_KEY) === "true";
  } catch {
    return false;
  }
}

function follow(): void {
  const next = readSiteLanguage();
  if (next === current.value) return;
  current.value = next;
  for (const listener of [ ...listeners ]) listener(next);
}

function afterPickingEvent(): void {
  const before = readStoredLanguage();
  const check = () => {
    if (readStoredLanguage() !== before) follow();
  };
  setTimeout(check, 0);
  setTimeout(check, LATE_CHECK_MS);
}

// Not in the service worker, which has no window and shows no text.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  for (const type of PICKING_EVENTS) {
    window.addEventListener(type, afterPickingEvent, { capture: true, passive: true });
  }
}
