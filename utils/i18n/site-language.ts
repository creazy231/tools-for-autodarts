/**
 * Which language autodarts is showing, worked out the way the site does it.
 *
 * Tools has no language setting of its own. It speaks whatever the site was
 * set to, so the two never disagree on one screen. The site keeps that choice
 * in `localStorage["autodarts.settings.language"]`, written by the Language
 * select on /settings/general and by the language item in the user menu. It is
 * not part of the account: the settings page saves its other switches through
 * the API, never this one. Picking "System" removes the key.
 *
 * With no key, the site's i18next asks the browser and takes the first entry
 * of `navigator.languages`. It sets no `supportedLngs`, so a first language it
 * has no text for (fr-FR) shows English even when German comes second; the
 * user menu's "Detected" line works it out the same way. Read from the site's
 * code on 2026-10-01 — see docs/superpowers/specs/2026-10-01-i18n-design.md.
 */

export type Language = "en" | "de" | "nl";

/** The languages Tools has text for. English first: it is the default. */
export const LANGUAGES: readonly Language[] = [ "en", "de", "nl" ];

/** Where the site keeps the language picked in its settings. Absent means "System". */
export const SITE_LANGUAGE_KEY = "autodarts.settings.language";

/**
 * The site's own normaliser: the part before the first `-`, lower-cased, if
 * Tools has text for it. "de-AT" → "de", "NL" → "nl", "fr" → undefined.
 */
export function normaliseLanguage(value: string | null | undefined): Language | undefined {
  const code = value?.split("-")[0].toLowerCase();
  return LANGUAGES.find(language => language === code);
}

/**
 * The value the site stored, or null when there is none — or when storage
 * cannot be read at all (blocked site data), which the site treats the same.
 */
export function readStoredLanguage(storage?: Pick<Storage, "getItem">): string | null {
  try {
    return (storage ?? globalThis.localStorage)?.getItem(SITE_LANGUAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * The language the site shows in this tab:
 *
 * 1. the stored choice, if Tools has text for it;
 * 2. English for any other stored choice but "system" — a language the site
 *    has added before Tools did, which Tools has no text for;
 * 3. with no choice, the browser's first language, if Tools has text for it;
 * 4. English.
 */
export function readSiteLanguage(
  storage?: Pick<Storage, "getItem">,
  nav?: Partial<Pick<Navigator, "languages" | "language">>,
): Language {
  const stored = readStoredLanguage(storage);
  const picked = normaliseLanguage(stored);
  if (picked) return picked;
  if (stored && stored !== "system") return "en";
  const navigator = nav ?? globalThis.navigator;
  return normaliseLanguage(navigator?.languages?.[0] ?? navigator?.language) ?? "en";
}
